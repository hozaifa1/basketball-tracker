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
    .bb-cover {
        margin: -1rem -1rem 1.5rem -1rem;
        height: 220px;
        border-radius: 0 0 1.5rem 1.5rem;
        background-image:
            linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.2)),
            url("https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1400&q=80");
        background-size: cover;
        background-position: center;
        position: relative;
        overflow: hidden;
        border-bottom: 1px solid #111827;
    }
    .bb-cover-inner {
        position: absolute;
        left: 3rem;
        bottom: 1.75rem;
        max-width: 480px;
    }
    .bb-cover-kicker {
        font-size: 0.8rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #fde68a;
        margin-bottom: 0.2rem;
    }
    .bb-cover-title {
        font-size: 2.1rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #fef3c7;
        text-shadow: 0 14px 40px rgba(0,0,0,0.8);
        margin-bottom: 0.25rem;
    }
    .bb-cover-subtitle {
        font-size: 0.98rem;
        color: #e5e7eb;
        text-shadow: 0 10px 30px rgba(0,0,0,0.75);
    }
    .bb-rules-card {
        margin: 0.25rem 0 1rem 0;
        padding: 1rem 1.25rem;
        border-radius: 0.75rem;
        border: 1px solid #1f2937;
        background: rgba(15,23,42,0.92);
    }
    .bb-rules-heading {
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: #f97316;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }
    .bb-rules-note {
        font-size: 0.85rem;
        color: #9ca3af;
        margin-bottom: 0.35rem;
    }
    .bb-rules-list {
        margin: 0;
        padding-left: 1.25rem;
        font-size: 0.9rem;
        color: #e5e7eb;
    }
    .bb-rules-list li {
        margin-bottom: 0.25rem;
    }
    .bb-rule-name {
        color: #f97316;
        font-weight: 600;
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
    .bb-login-card {
        margin-top: 4rem;
        padding: 2rem 2.25rem 1.75rem 2.25rem;
        border-radius: 1rem;
        border: 1px solid #1f2937;
        background: radial-gradient(circle at 0 0, #111827 0, #020617 55%);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    }
    .bb-login-hero {
        text-align: center;
    }
    .bb-login-ball {
        width: 72px;
        height: 72px;
        margin: 0 auto 1rem auto;
        border-radius: 9999px;
        border: 3px solid #f97316;
        background: radial-gradient(circle at 30% 30%, #fed7aa, #f97316);
        box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3), 0 18px 30px rgba(0, 0, 0, 0.65);
        position: relative;
        overflow: hidden;
    }
    .bb-login-ball::before,
    .bb-login-ball::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 2px solid rgba(15,23,42,0.8);
    }
    .bb-login-ball::before {
        border-top: none;
        border-bottom: none;
        transform: rotate(18deg);
    }
    .bb-login-ball::after {
        border-left: none;
        border-right: none;
        transform: rotate(-18deg);
    }
    .bb-login-title {
        font-size: 1.4rem;
        font-weight: 800;
        color: #f97316;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.35rem;
    }
    .bb-login-subtitle {
        font-size: 0.95rem;
        color: #9ca3af;
    }
    [data-testid="stTable"] table th,
    [data-testid="stTable"] table td,
    [data-testid="stDataFrame"] table th,
    [data-testid="stDataFrame"] table td,
    table th,
    table td {
        text-align: center !important;
    }
    [data-testid="stTable"] table th > div,
    [data-testid="stTable"] table td > div,
    [data-testid="stDataFrame"] table th > div,
    [data-testid="stDataFrame"] table td > div {
        justify-content: center !important;
        text-align: center !important;
    }

    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def load_user_store() -> Dict[str, Dict[str, str]]:
    try:
        raw_users = st.secrets["users"]
    except Exception:
        raw_users = None

    def get_secret_value(key: str, default: str) -> str:
        getter = getattr(st.secrets, "get", None)
        if callable(getter):
            try:
                value = getter(key, default)
            except Exception:
                value = default
        else:
            value = default
        return str(value)

    # If there is no explicit users config, fall back to a single admin account.
    if raw_users is None:
        default_password = get_secret_value("ADMIN_PASSWORD", "admin")
        return {
            "admin": {
                "password": default_password,
                "role": USER_ROLE_ADMIN,
            }
        }

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
        key = str(username).strip().lower()
        parsed[key] = {
            "password": str(password),
            "role": role,
        }

    # If users table exists but nothing parsed correctly, still provide a default admin.
    if not parsed:
        default_password = get_secret_value("ADMIN_PASSWORD", "admin")
        return {
            "admin": {
                "password": default_password,
                "role": USER_ROLE_ADMIN,
            }
        }

    return parsed


def require_user_login(user_store: Dict[str, Dict[str, str]]) -> Dict[str, str]:
    existing = st.session_state.get("auth_user")
    if existing and existing.get("username") in user_store:
        username_key = existing["username"]
        role = user_store[username_key]["role"]
        st.session_state["auth_user"] = {"username": username_key, "role": role}
        st.sidebar.subheader("User")
        st.sidebar.success(f"Signed in as {username_key} ({role.title()})")
        if st.sidebar.button("Log out"):
            st.session_state.pop("auth_user", None)
            st.rerun()
        return st.session_state["auth_user"]

    # If there is exactly one configured user, automatically log in as that user.
    if not existing and len(user_store) == 1:
        username_key = next(iter(user_store.keys()))
        role = user_store[username_key]["role"]
        st.session_state["auth_user"] = {"username": username_key, "role": role}
        return st.session_state["auth_user"]

    col_left, col_center, col_right = st.columns([1, 2, 1])
    with col_center:
        st.markdown(
            """
            <div class="bb-login-card">
                <div class="bb-login-hero">
                    <div class="bb-login-ball"></div>
                    <div class="bb-login-title">Courtside Login</div>
                    <div class="bb-login-subtitle">
                        Sign in to track attendance, fines, and logs for your squad.
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        with st.form("login_form"):
            raw_username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Log in")
            if submitted:
                username_key = raw_username.strip().lower()
                user_record = user_store.get(username_key)

                if user_record:
                    st.session_state["auth_user"] = {
                        "username": username_key,
                        "role": user_record.get("role", USER_ROLE_VIEWER),
                    }
                    st.success("Login successful. Reloading...")
                    st.rerun()
                else:
                    known_users = ", ".join(sorted(user_store.keys())) or "(none)"
                    st.error("Invalid username or password.")
                    st.caption(f"Configured usernames: {known_users}")

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


def recompute_all_balances(client: Client) -> bool:
    """Recompute all player balances from the full attendance history.

    Returns True on success, False if any Supabase error/exception occurs.
    """
    players = fetch_players(client)
    if not players:
        return True

    players_by_name: Dict[str, Dict[str, Any]] = {
        p.get("name"): p for p in players if p.get("name") is not None
    }

    # Initialize aggregate deltas
    agg_deltas: Dict[str, Dict[str, float]] = {}
    for name in players_by_name.keys():
        agg_deltas[name] = {"total": 0.0, "akib": 0.0}

    # Load all attendance records ordered by date
    try:
        response = (
            client.table("attendance")
            .select("date, player_name, status")
            .order("date")  # ascending by default
            .execute()
        )
    except Exception as exc:
        st.error(f"Failed to recompute balances from attendance: {exc}")
        return False

    data = getattr(response, "data", None)
    error = getattr(response, "error", None)

    if error:
        st.error(f"Supabase error while reading attendance for recompute: {error}")
        return False

    if not data:
        # No attendance at all → zero out balances
        for name in players_by_name.keys():
            try:
                client.table("players").update(
                    {"total_balance": 0, "akib_balance": 0}
                ).eq("name", name).execute()
            except Exception as exc:
                st.error(f"Failed to reset balances for {name}: {exc}")
                return False
        return True

    # Group attendance by date
    by_date: Dict[str, Dict[str, str]] = {}
    for row in data:
        d = row.get("date")
        player_name = row.get("player_name")
        status = row.get("status")
        if not d or not player_name or not status:
            continue
        key = str(d)
        if key not in by_date:
            by_date[key] = {}
        by_date[key][player_name] = status

    # Local helper: compute deltas for a single day
    def daily_deltas(status_by_player: Dict[str, str]) -> Dict[str, Dict[str, float]]:
        deltas: Dict[str, Dict[str, float]] = {}
        for name in players_by_name.keys():
            deltas[name] = {"total": 0.0, "akib": 0.0}

        statuses = list(status_by_player.values())
        num_late = sum(1 for s in statuses if s == "Late")
        num_absent_uninformed = sum(1 for s in statuses if s == "Absent-Uninformed")

        def get_group(player_name: str) -> Any:
            p = players_by_name.get(player_name)
            if not p:
                return None
            return p.get("group")

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

        # Rule 4: One Absent-Uninformed
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

        return deltas

    for date_key in sorted(by_date.keys()):
        day_status = by_date[date_key]
        daily = daily_deltas(day_status)
        for name, delta in daily.items():
            agg_deltas[name]["total"] += delta["total"]
            agg_deltas[name]["akib"] += delta["akib"]

    # Apply aggregate deltas as absolute balances (baseline = 0)
    for name, sums in agg_deltas.items():
        if name not in players_by_name:
            continue
        try:
            client.table("players").update(
                {
                    "total_balance": int(sums["total"]),
                    "akib_balance": int(sums["akib"]),
                }
            ).eq("name", name).execute()
        except Exception as exc:
            st.error(f"Failed to apply recomputed balances for {name}: {exc}")
            return False

    return True


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

    if "group" in df.columns:
        if "total_balance" in df.columns:
            df = df.sort_values(["group", "total_balance"], ascending=[True, False])
        else:
            df = df.sort_values("group", ascending=True)
    elif "total_balance" in df.columns:
        df = df.sort_values("total_balance", ascending=False)

    df = df.reset_index(drop=True)

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
            .set_properties(**{"text-align": "center"})
        )
        st.dataframe(styled, use_container_width=True)
    else:
        styled = df.style.hide(axis="index").set_properties(**{"text-align": "center"})
        st.dataframe(styled, use_container_width=True)


def render_attendance_logs(client: Client) -> None:
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

    styled_logs = df_display.style.hide(axis="index").set_properties(**{"text-align": "center"})
    st.dataframe(styled_logs, use_container_width=True)

    if "id" not in df.columns or df["id"].isnull().all():
        return

    try:
        expected_pw = st.secrets["users"]["admin"]["password"]
    except Exception:
        expected_pw = "admin"

    logs_unlocked = st.session_state.get("logs_unlocked", False)

    st.markdown("### Edit & Delete Attendance (Password Required)")
    pw_input = st.text_input(
        "Password to unlock editing and delete controls",
        type="password",
        key="logs_pw",
    )
    if st.button("Unlock Logs Controls", key="logs_unlock_btn"):
        if pw_input == expected_pw:
            st.session_state["logs_unlocked"] = True
            logs_unlocked = True
            st.success("Log editing and delete controls unlocked for this session.")
        else:
            st.error("Incorrect password.")
    if not logs_unlocked:
        st.info("Editing and delete controls are locked. Enter the password above to unlock.")
        return

    select_all = st.checkbox("Select all rows", key="logs_select_all")

    df_for_editor = df.copy()
    if "selected" not in df_for_editor.columns:
        df_for_editor["selected"] = False
    if select_all:
        df_for_editor["selected"] = True

    try:
        players_data = fetch_players(client)
        player_options = sorted({p.get("name") for p in players_data if p.get("name")})
    except Exception:
        player_options = sorted({n for n in df_for_editor.get("player_name", []) if n})

    edited_df = st.data_editor(
        df_for_editor,
        hide_index=True,
        disabled=["id", "date"],
        use_container_width=True,
        key="attendance_logs_editor",
        column_config={
            "id": st.column_config.NumberColumn("ID", width="small"),
            "date": st.column_config.DateColumn("Date"),
            "player_name": st.column_config.SelectboxColumn("Player", options=player_options),
            "status": st.column_config.SelectboxColumn("Status", options=STATUS_OPTIONS),
            "selected": st.column_config.CheckboxColumn("Select"),
        },
    )

    original_by_id = {
        row["id"]: row for row in df.to_dict(orient="records") if row.get("id") is not None
    }

    col_save, col_delete = st.columns(2)

    with col_save:
        if st.button("Save Edits", key="logs_save_edits"):
            updated_count = 0
            for row in edited_df.to_dict(orient="records"):
                rid = row.get("id")
                if rid is None or rid not in original_by_id:
                    continue
                original = original_by_id[rid]
                new_status = row.get("status")
                new_player = row.get("player_name")

                update_fields: Dict[str, Any] = {}
                if new_status != original.get("status"):
                    update_fields["status"] = new_status
                if new_player != original.get("player_name"):
                    update_fields["player_name"] = new_player

                if not update_fields:
                    continue

                try:
                    response = (
                        client.table("attendance")
                        .update(update_fields)
                        .eq("id", rid)
                        .execute()
                    )
                except Exception as exc:
                    st.error(f"Failed to update attendance entry {rid}: {exc}")
                    continue
                error = getattr(response, "error", None)
                if error:
                    st.error(f"Supabase error while updating entry {rid}: {error}")
                    continue
                updated_count += 1

            if updated_count > 0:
                recompute_all_balances(client)
                st.success(
                    f"Saved edits for {updated_count} entr"
                    + ("y" if updated_count == 1 else "ies")
                    + "."
                )
                st.rerun()
            else:
                st.info("No changes detected to save.")

    with col_delete:
        if st.button("Delete Selected Logs", key="logs_delete_selected"):
            if select_all:
                selected_ids = [
                    row.get("id")
                    for row in edited_df.to_dict(orient="records")
                    if row.get("id") is not None
                ]
            else:
                selected_ids = [
                    row.get("id")
                    for row in edited_df.to_dict(orient="records")
                    if row.get("selected") and row.get("id") is not None
                ]

            if not selected_ids:
                st.warning("No rows selected for deletion.")
            else:
                deleted_count = 0
                for rid in selected_ids:
                    if delete_attendance_entry(client, rid):
                        deleted_count += 1
                if deleted_count > 0:
                    recompute_all_balances(client)
                    st.success(
                        f"Deleted {deleted_count} entr"
                        + ("y" if deleted_count == 1 else "ies")
                        + "."
                    )
                    st.rerun()
                else:
                    st.error("No entries were deleted.")


def main() -> None:
    st.set_page_config(page_title="Basketball Budget Tracker", layout="wide")

    inject_global_css()
    st.markdown(
        """
        <div class="bb-cover">
            <div class="bb-cover-inner">
                <div class="bb-cover-kicker">DU EEE</div>
                <div class="bb-cover-title">DU EEE Basketball Team</div>
                <div class="bb-cover-subtitle">Budget &amp; Attendance Tracker</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
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

    supabase = get_supabase_client()

    players = fetch_players(supabase)
    if not players:
        st.info("No players configured in the database yet.")
        return

    tab_balances, tab_log, tab_logs = st.tabs(
        ["Balances & Costs", "Log Attendance", "Attendance Logs"]
    )

    with tab_balances:
        st.subheader("Balances & Costs")
        st.markdown(
            """
            <div class="bb-rules-card">
                <div class="bb-rules-heading">Fine Rules</div>
                <div class="bb-rules-note">Balances are fully recomputed from attendance logs using these rules:</div>
                <ol class="bb-rules-list">
                    <li><span class="bb-rule-name">Team Perfect</span> – If everyone is <em>On Time</em> or <em>Absent-Informed</em>, Akib bhai will pay a reward of 20 to each group leader.</li>
                    <li><span class="bb-rule-name">Leader Late</span> – For each group leader marked <em>Late</em>, that leader will pay 40 to Akib bhai.</li>
                    <li><span class="bb-rule-name">Group Suicide</span> – In each group, whenever a member is marked <em>Late</em>, that player will pay 10 to their own group leader. Members always pay to their team leader, not directly to Akib bhai.</li>
                    <li><span class="bb-rule-name">One Absent-Uninformed</span> – If exactly one player in the team is <em>Absent-Uninformed</em> and everyone else is On Time / Absent-Informed, that player’s group leader will pay 10 to Akib bhai.</li>
                    <li><span class="bb-rule-name">Absent-Informed</span> – Has no direct fine; it only affects whether the other rules above are triggered.</li>
                </ol>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button("Recompute balances from attendance", key="recompute_balances_btn"):
            ok = recompute_all_balances(supabase)
            if ok:
                st.success("Balances recomputed from attendance history.")
                st.rerun()

        render_leaderboard(supabase)

    with tab_log:
        st.subheader("Log Attendance")

        try:
            expected_pw = st.secrets["users"]["admin"]["password"]
        except Exception:
            expected_pw = "admin"

        log_unlocked = st.session_state.get("log_unlocked", False)
        pw_input = st.text_input(
            "Password to unlock attendance logging",
            type="password",
            key="log_pw",
        )
        if st.button("Unlock Attendance Logging", key="log_unlock_btn"):
            if pw_input == expected_pw:
                st.session_state["log_unlocked"] = True
                log_unlocked = True
                st.success("Attendance logging unlocked for this session.")
            else:
                st.error("Incorrect password.")

        if log_unlocked:
            attendance_date = st.date_input("Attendance date", value=date.today())

            status_by_player: Dict[str, str] = {}

            groups = sorted({p.get("group") for p in players})

            with st.form("attendance_form"):
                for g in groups:
                    group_players = [p for p in players if p.get("group") == g]
                    if not group_players:
                        continue

                    group_label_raw = str(g)
                    num_part = (
                        group_label_raw.replace("Group", "").replace("group", "").strip()
                    )
                    if not num_part:
                        num_part = group_label_raw.strip()

                    player_names = [p.get("name") for p in group_players if p.get("name")]
                    names_str = ", ".join(player_names)

                    base_label = f"Group -{num_part}"
                    if names_str:
                        display_group_label = f"{base_label} ( {names_str} )"
                    else:
                        display_group_label = base_label

                    group_expander = st.expander(display_group_label, expanded=False)
                    with group_expander:
                        columns = st.columns(2)
                        attendance_options = ["Select attendance"] + STATUS_OPTIONS
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
                                    attendance_options,
                                    index=0,
                                    key=widget_key,
                                )
                            status_by_player[name] = selected_status

                submitted = st.form_submit_button("Submit Attendance")

            if submitted:
                if not status_by_player:
                    st.warning("No attendance data to submit.")
                elif any(
                    status == "Select attendance" for status in status_by_player.values()
                ):
                    st.warning("Please select attendance for all players before submitting.")
                else:
                    insert_attendance_records(supabase, attendance_date, status_by_player)
                    ok = recompute_all_balances(supabase)
                    if ok:
                        st.success("Attendance submitted and balances updated.")
        else:
            st.info("Attendance logging is locked. Enter the password above to unlock.")

    with tab_logs:
        render_attendance_logs(supabase)

    st.markdown(
        """
        <div class="bb-footer" style="margin-top: 2rem; padding: 0.75rem 0; font-size: 0.8rem; color: #9ca3af; text-align: center; border-top: 1px solid #1f2937;">
            -Made by S. M. Hozaifa Hossain, Treasurer, DU EEE-55
        </div>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()

