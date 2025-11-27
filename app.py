import streamlit as st
from datetime import date
from typing import Dict, List, Any

import pandas as pd
from supabase import create_client, Client


STATUS_OPTIONS = [
    "On Time",
    "Late",
    "Absent-Informed",
    "Absent-Uninformed",
]

USER_ROLE_ADMIN = "admin"
USER_ROLE_VIEWER = "viewer"


def inject_global_css() -> None:
    css = """
    <style>
    .stApp {
        background: radial-gradient(circle at 0 0, #1f2937 0, #020617 45%, #020617 100%);
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    .bb-header {
        padding: 1.75rem 0 1rem 0;
        border-bottom: 1px solid #1f2937;
        margin-bottom: 0.5rem;
    }
    .bb-header-title {
        font-size: 2rem;
        font-weight: 800;
        color: #f97316;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .bb-header-subtitle {
        font-size: 0.95rem;
        color: #9ca3af;
    }
    [data-testid="stSidebar"] {
        background: #020617;
        border-right: 1px solid #111827;
    }
    [data-testid="stSidebar"] * {
        color: #e5e7eb !important;
    }
    [data-testid="stExpander"] {
        border-radius: 0.75rem;
        border: 1px solid #1f2937;
        background: rgba(15,23,42,0.9);
    }
    [data-testid="stExpander"] summary {
        font-weight: 600;
        color: #f97316;
    }
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def load_user_store() -> Dict[str, Dict[str, str]]:
    try:
        raw_users = st.secrets["users"]
    except Exception:
        st.error("User credentials configuration is missing in st.secrets['users'].")
        st.stop()

    parsed: Dict[str, Dict[str, str]] = {}
    if hasattr(raw_users, "items"):
        iterator = raw_users.items()
    else:
        iterator = []

    for username, record in iterator:
        if not isinstance(record, dict):
            continue
        password = record.get("password")
        role = str(record.get("role", USER_ROLE_VIEWER)).lower()
        if password is None:
            continue
        if role not in {USER_ROLE_ADMIN, USER_ROLE_VIEWER}:
            role = USER_ROLE_VIEWER
        parsed[str(username)] = {
            "password": str(password),
            "role": role,
        }

    if not parsed:
        st.error("No valid user entries found under st.secrets['users'].")
        st.stop()

    return parsed


def require_user_login(user_store: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    st.sidebar.subheader("User Access")
    existing = st.session_state.get("auth_user")
    if existing and existing.get("username") in user_store:
        username = existing["username"]
        role = user_store[username]["role"]
        st.session_state["auth_user"] = {"username": username, "role": role}
        st.sidebar.success(f"Signed in as {username} ({role.title()})")
        if st.sidebar.button("Log out"):
            st.session_state.pop("auth_user", None)
            st.rerun()
        return st.session_state["auth_user"]

    with st.sidebar.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Log in")
        if submitted:
            user_record = user_store.get(username)
            if user_record and password == user_record.get("password"):
                st.session_state["auth_user"] = {
                    "username": username,
                    "role": user_record.get("role", USER_ROLE_VIEWER),
                }
                st.success("Login successful. Reloading...")
                st.rerun()
            else:
                st.error("Invalid username or password.")

    st.info("Please sign in to access the tracker.")
    st.stop()


def user_is_admin(user: Dict[str, str]) -> bool:
    return user.get("role") == USER_ROLE_ADMIN


def fetch_attendance_logs(client: Client, limit: int = 200) -> List[Dict[str, Any]]:
    try:
        response = (
            client.table("attendance")
            .select("id, date, player_name, status")
            .order("date", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        st.error(f"Failed to load attendance logs: {exc}")
        return []

    data = getattr(response, "data", None)
    error = getattr(response, "error", None)

    if error:
        st.error(f"Supabase error while loading attendance logs: {error}")
        return []

    if not isinstance(data, list):
        st.error("Unexpected attendance logs response format from Supabase.")
        return []

    return data


def delete_attendance_entry(client: Client, entry_id: Any) -> bool:
    if entry_id is None:
        st.error("Cannot delete log without an identifier.")
        return False

    try:
        response = client.table("attendance").delete().eq("id", entry_id).execute()
    except Exception as exc:
        st.error(f"Failed to delete attendance entry: {exc}")
        return False

    error = getattr(response, "error", None)
    if error:
        st.error(f"Supabase error while deleting attendance entry: {error}")
        return False

    return True


@st.cache_resource
def get_supabase_client() -> Client:
    try:
        url = st.secrets["SUPABASE_URL"]
        key = st.secrets["SUPABASE_KEY"]
    except Exception:
        st.error("Supabase credentials SUPABASE_URL/SUPABASE_KEY are missing in st.secrets.")
        st.stop()

    if not url or not key:
        st.error("Supabase credentials SUPABASE_URL/SUPABASE_KEY are missing in st.secrets.")
        st.stop()

    return create_client(url, key)


def fetch_players(client: Client) -> List[Dict[str, Any]]:
    """Fetch all players from the Supabase players table."""
    try:
        response = client.table("players").select("*").execute()
    except Exception as exc:  # network / client issues
        st.error(f"Failed to fetch players from Supabase: {exc}")
        st.stop()

    data = getattr(response, "data", None)
    error = getattr(response, "error", None)

    if error:
        st.error(f"Supabase error while fetching players: {error}")
        st.stop()

    if not isinstance(data, list):
        st.error("Unexpected players response format from Supabase.")
        st.stop()

    return data


def insert_attendance_records(
    client: Client,
    attendance_date: date,
    status_by_player: Dict[str, str],
) -> None:
    """Insert attendance records for all players for a given date."""
    rows = [
        {
            "date": attendance_date.isoformat(),
            "player_name": name,
            "status": status,
        }
        for name, status in status_by_player.items()
    ]

    try:
        response = client.table("attendance").insert(rows).execute()
    except Exception as exc:
        st.error(f"Failed to insert attendance records: {exc}")
        return

    error = getattr(response, "error", None)
    if error:
        st.error(f"Supabase error while inserting attendance: {error}")


def apply_fine_rules(
    client: Client,
    players: List[Dict[str, Any]],
    status_by_player: Dict[str, str],
) -> None:
    """Apply all fine rules and update the players table balances."""

    # Initialize deltas per player
    deltas: Dict[str, Dict[str, float]] = {}
    for p in players:
        name = p.get("name")
        if not name:
            continue
        deltas[name] = {"total": 0.0, "akib": 0.0}

    players_by_name: Dict[str, Dict[str, Any]] = {
        p.get("name"): p for p in players if p.get("name") is not None
    }

    # Global counts
    statuses = list(status_by_player.values())
    num_late = sum(1 for s in statuses if s == "Late")
    num_absent_uninformed = sum(1 for s in statuses if s == "Absent-Uninformed")

    # Helper to get group of a player
    def get_group(player_name: str) -> Any:
        p = players_by_name.get(player_name)
        if not p:
            return None
        return p.get("group")

    # Helper to find leaders in a specific group
    def leaders_in_group(group_value: Any) -> List[Dict[str, Any]]:
        return [
            p
            for p in players
            if p.get("group") == group_value and bool(p.get("is_leader"))
        ]

    # Rule 1: Team Perfect
    if num_late == 0 and num_absent_uninformed == 0:
        for p in players:
            if bool(p.get("is_leader")) and p.get("name") in deltas:
                deltas[p["name"]]["total"] += 20
                deltas[p["name"]]["akib"] -= 20

    # Rule 4: One Absent-Uninformed (only if no Late and exactly one Absent-Uninformed)
    elif num_late == 0 and num_absent_uninformed == 1:
        absent_name = None
        for name, status in status_by_player.items():
            if status == "Absent-Uninformed":
                absent_name = name
                break

        if absent_name is not None:
            group_value = get_group(absent_name)
            if group_value is not None:
                leaders = leaders_in_group(group_value)
                for leader in leaders:
                    lname = leader.get("name")
                    if lname in deltas:
                        deltas[lname]["total"] -= 10
                        deltas[lname]["akib"] += 10

    # Rule 2: Leader Late
    for p in players:
        name = p.get("name")
        if not name:
            continue
        if bool(p.get("is_leader")) and status_by_player.get(name) == "Late":
            deltas[name]["total"] -= 40
            deltas[name]["akib"] += 40

    # Rule 3: Group Suicide
    groups = sorted({p.get("group") for p in players})
    for g in groups:
        group_players = [p for p in players if p.get("group") == g]
        late_players = [
            p for p in group_players if status_by_player.get(p.get("name")) == "Late"
        ]
        n_late = len(late_players)
        if n_late <= 0:
            continue

        leaders = [p for p in group_players if bool(p.get("is_leader"))]
        for leader in leaders:
            lname = leader.get("name")
            if lname in deltas:
                deltas[lname]["total"] += 10 * n_late

        for lp in late_players:
            lpname = lp.get("name")
            if lpname in deltas:
                deltas[lpname]["total"] -= 10

    def to_int(value: Any) -> int:
        """Safely convert numeric/str values to an int, defaulting to 0 on failure."""
        try:
            return int(value)
        except (TypeError, ValueError):
            try:
                return int(float(value))
            except (TypeError, ValueError):
                return 0

    # Apply deltas to Supabase
    for name, delta in deltas.items():
        player = players_by_name.get(name)
        if not player:
            continue

        d_total = delta["total"]
        d_akib = delta["akib"]
        if d_total == 0 and d_akib == 0:
            continue

        current_total = player.get("total_balance")
        current_akib = player.get("akib_balance")

        new_total = to_int(current_total) + to_int(d_total)
        new_akib = to_int(current_akib) + to_int(d_akib)

        update_data = {
            "total_balance": new_total,
            "akib_balance": new_akib,
        }

        try:
            response = client.table("players").update(update_data).eq("name", name).execute()
        except Exception as exc:
            st.error(f"Failed to update balances for {name}: {exc}")
            continue

        error = getattr(response, "error", None)
        if error:
            st.error(f"Supabase error while updating {name}: {error}")


def render_leaderboard(client: Client) -> None:
    """Fetch players and display a leaderboard sorted by total_balance."""
    try:
        response = (
            client.table("players")
            .select("name, group, is_leader, total_balance, akib_balance")
            .order("total_balance", desc=True)
            .execute()
        )
    except Exception as exc:
        st.error(f"Failed to load leaderboard from Supabase: {exc}")
        return

    data = getattr(response, "data", None)
    error = getattr(response, "error", None)

    if error:
        st.error(f"Supabase error while loading leaderboard: {error}")
        return

    if not data:
        st.info("No players found for leaderboard.")
        return

    df = pd.DataFrame(data)

    for col in ["total_balance", "akib_balance"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    if "total_balance" in df.columns:
        df = df.sort_values("total_balance", ascending=False)

    df = df.reset_index(drop=True)
    df.insert(0, "Rank", range(1, len(df) + 1))

    if "is_leader" in df.columns:
        df["is_leader"] = df["is_leader"].apply(lambda x: "Leader" if bool(x) else "")

    rename_map = {
        "name": "Player",
        "group": "Group",
        "is_leader": "Role",
        "total_balance": "Total Balance",
        "akib_balance": "Akib Balance",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    def highlight_balance(val: Any) -> str:
        try:
            v = float(val)
        except (TypeError, ValueError):
            return ""
        if v < 0:
            return "color: #ef4444; font-weight: 600;"
        if v > 0:
            return "color: #22c55e; font-weight: 600;"
        return "color: #e5e7eb;"

    subset_cols = [c for c in ["Total Balance", "Akib Balance"] if c in df.columns]
    if subset_cols:
        styled = (
            df.style.hide(axis="index")
            .applymap(highlight_balance, subset=subset_cols)
        )
        st.dataframe(styled, use_container_width=True)
    else:
        styled = df.style.hide(axis="index")
        st.dataframe(styled, use_container_width=True)


def render_attendance_logs(client: Client, is_admin: bool) -> None:
    st.subheader("Attendance Logs")
    logs = fetch_attendance_logs(client)
    if not logs:
        st.info("No attendance records yet.")
        return

    df = pd.DataFrame(logs)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.sort_values("date", ascending=False)
    df = df.reset_index(drop=True)

    rename_map = {
        "date": "Date",
        "player_name": "Player",
        "status": "Status",
    }
    df_display = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    st.dataframe(df_display, use_container_width=True)

    if is_admin and "id" in df.columns and not df["id"].isnull().all():
        st.markdown("### Admin Controls")
        log_rows = df.to_dict(orient="records")
        option_labels = [
            f"{idx + 1}. {row.get('date', 'Unknown Date')} — {row.get('player_name', 'Unknown')} ({row.get('status', 'Unknown')})"
            for idx, row in enumerate(log_rows)
        ]
        id_lookup = {
            label: row.get("id")
            for label, row in zip(option_labels, log_rows)
            if row.get("id") is not None
        }

        if not id_lookup:
            st.warning("No deletable entries found (missing IDs).")
            return

        with st.form("delete_attendance_entry_form"):
            selected_label = st.selectbox("Select a log entry to delete", list(id_lookup.keys()))
            confirm = st.form_submit_button("Delete Selected Entry")

            if confirm:
                success = delete_attendance_entry(client, id_lookup[selected_label])
                if success:
                    st.success("Attendance entry deleted.")
                    st.rerun()


def main() -> None:
    st.set_page_config(page_title="Basketball Budget Tracker", layout="wide")

    inject_global_css()
    st.markdown(
        """
        <div class="bb-header">
            <div class="bb-header-title">Basketball Budget Tracker</div>
            <div class="bb-header-subtitle">
                Track attendance, fines, and leader balances for your squad.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    user_store = load_user_store()
    auth_user = require_user_login(user_store)
    supabase = get_supabase_client()
    is_admin = user_is_admin(auth_user)

    # Sidebar configuration info
    st.sidebar.header("Configuration")
    st.sidebar.write("Supabase connection: configured via st.secrets")

    players = fetch_players(supabase)
    if not players:
        st.info("No players configured in the database yet.")
        return

    attendance_col, leaderboard_col = st.columns([2, 1])

    with attendance_col:
        st.subheader("Attendance Input")

        attendance_date = st.date_input("Attendance date", value=date.today())

        # Build form for attendance
        status_by_player: Dict[str, str] = {}

        # Group players by their group value
        groups = sorted({p.get("group") for p in players})

        with st.form("attendance_form"):
            for g in groups:
                group_players = [p for p in players if p.get("group") == g]
                if not group_players:
                    continue

                group_label = str(g)
                if not group_label.lower().startswith("group"):
                    display_group_label = f"Group {group_label}"
                else:
                    display_group_label = group_label

                group_expander = st.expander(display_group_label, expanded=True)
                with group_expander:
                    columns = st.columns(2)
                    for idx, p in enumerate(group_players):
                        name = p.get("name")
                        if not name:
                            continue

                        label = name
                        if bool(p.get("is_leader")):
                            label = f"{name} (Leader)"

                        widget_key = f"attendance_{g}_{name}"
                        target_col = columns[idx % len(columns)]
                        with target_col:
                            selected_status = st.selectbox(
                                label,
                                STATUS_OPTIONS,
                                index=0,
                                key=widget_key,
                            )
                        status_by_player[name] = selected_status

            submitted = st.form_submit_button("Submit Attendance")

        if submitted:
            if not status_by_player:
                st.warning("No attendance data to submit.")
            else:
                apply_fine_rules(supabase, players, status_by_player)
                insert_attendance_records(supabase, attendance_date, status_by_player)
                st.success("Attendance submitted and balances updated.")

    with leaderboard_col:
        st.subheader("Leaderboard")
        render_leaderboard(supabase)

    render_attendance_logs(supabase, is_admin)


if __name__ == "__main__":
    main()

