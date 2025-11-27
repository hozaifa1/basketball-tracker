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

        if current_total is None:
            current_total = 0
        if current_akib is None:
            current_akib = 0

        new_total = float(current_total) + float(d_total)
        new_akib = float(current_akib) + float(d_akib)

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

    # Ensure numeric types for balances
    for col in ["total_balance", "akib_balance"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    def highlight_negative(val: Any) -> str:
        try:
            v = float(val)
        except (TypeError, ValueError):
            return ""
        return "color: red" if v < 0 else ""

    subset_cols = [c for c in ["total_balance", "akib_balance"] if c in df.columns]
    if subset_cols:
        styled = df.style.applymap(highlight_negative, subset=subset_cols)
        st.dataframe(styled, use_container_width=True)
    else:
        st.dataframe(df, use_container_width=True)


def main() -> None:
    st.set_page_config(page_title="Basketball Budget Tracker", layout="wide")

    st.title("Basketball Budget Tracker")

    supabase = get_supabase_client()

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

                st.markdown(f"### {display_group_label}")

                for p in group_players:
                    name = p.get("name")
                    if not name:
                        continue

                    label = name
                    if bool(p.get("is_leader")):
                        label = f"{name} (Leader)"

                    widget_key = f"attendance_{g}_{name}"
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


if __name__ == "__main__":
    main()

