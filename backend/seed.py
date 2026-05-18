"""
GoalFlow — Seed Script
Populates the database with demo data for all roles.

Run: python seed.py
"""

import asyncio
import sys
import os
from datetime import date, datetime
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, async_session, Base
from app.models.user import User
from app.models.goal import Cycle, GoalSheet, Goal, SharedGoal
from app.models.checkin import CheckIn
from app.models.escalation import EscalationRule
from app.core.security import hash_password


async def seed():
    """Seed all demo data."""
    print("[SEED] Seeding GoalFlow database...")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ─── Users ────────────────────────────────────────────────────
        print("  Creating users...")

        admin = User(
            name="Sarah Admin", email="admin@goalflow.com",
            password_hash=hash_password("Admin@123"), role="admin",
            department="HR",
        )

        manager1 = User(
            name="Rajesh Kumar", email="manager@goalflow.com",
            password_hash=hash_password("Manager@123"), role="manager",
            department="Engineering",
        )

        manager2 = User(
            name="Anita Desai", email="manager2@goalflow.com",
            password_hash=hash_password("Manager@123"), role="manager",
            department="Sales",
        )

        db.add_all([admin, manager1, manager2])
        await db.flush()

        # Employees under Rajesh
        employees_eng = []
        eng_data = [
            ("Priya Sharma", "employee@goalflow.com"),
            ("Amit Patel", "amit@goalflow.com"),
            ("Sneha Reddy", "sneha@goalflow.com"),
            ("Vikram Singh", "vikram@goalflow.com"),
            ("Neha Gupta", "neha@goalflow.com"),
            ("Rohan Das", "rohan@goalflow.com"),
        ]
        for name, email in eng_data:
            emp = User(
                name=name, email=email,
                password_hash=hash_password("Employee@123"), role="employee",
                department="Engineering", manager_id=manager1.id,
            )
            db.add(emp)
            employees_eng.append(emp)
        await db.flush()

        # Employees under Anita
        employees_sales = []
        sales_data = [
            ("Kavita Joshi", "kavita@goalflow.com"),
            ("Suresh Menon", "suresh@goalflow.com"),
            ("Divya Nair", "divya@goalflow.com"),
        ]
        for name, email in sales_data:
            emp = User(
                name=name, email=email,
                password_hash=hash_password("Employee@123"), role="employee",
                department="Sales", manager_id=manager2.id,
            )
            db.add(emp)
            employees_sales.append(emp)
        await db.flush()

        priya = employees_eng[0]

        # ─── Cycle ────────────────────────────────────────────────────
        print("  Creating active cycle...")

        cycle = Cycle(
            year=2025, name="FY 2025-26",
            goal_setting_opens=date(2025, 5, 1),
            is_active=True, created_by=admin.id,
        )
        db.add(cycle)
        await db.flush()

        # ─── Priya's Approved Goal Sheet ──────────────────────────────
        print("  Creating Priya's goal sheet (approved with Q1/Q2 check-ins)...")

        priya_sheet = GoalSheet(
            employee_id=priya.id, cycle_id=cycle.id,
            status="approved", submitted_at=datetime(2025, 5, 10),
            approved_at=datetime(2025, 5, 12), approved_by=manager1.id,
            is_locked=True,
        )
        db.add(priya_sheet)
        await db.flush()

        # 4 goals with varied UoM types
        priya_goals = [
            Goal(
                goal_sheet_id=priya_sheet.id,
                thrust_area="Revenue Growth",
                title="Increase quarterly module delivery throughput by 25%",
                description="Deliver more features per sprint through better estimation and tooling.",
                uom_type="percentage_min", target_value=Decimal("25.00"),
                weightage=Decimal("30.00"), display_order=0,
            ),
            Goal(
                goal_sheet_id=priya_sheet.id,
                thrust_area="Quality Improvement",
                title="Reduce production bugs to fewer than 5 per release",
                description="Implement better testing practices and code review standards.",
                uom_type="numeric_max", target_value=Decimal("5.00"),
                weightage=Decimal("25.00"), display_order=1,
            ),
            Goal(
                goal_sheet_id=priya_sheet.id,
                thrust_area="People Development",
                title="Complete AWS Solutions Architect certification by Dec 2025",
                description="Obtain AWS certification to support cloud migration initiative.",
                uom_type="timeline", target_date=date(2025, 12, 31),
                weightage=Decimal("20.00"), display_order=2,
            ),
            Goal(
                goal_sheet_id=priya_sheet.id,
                thrust_area="Innovation",
                title="Zero security incidents in deployed code",
                description="Maintain clean security record through SAST/DAST integration.",
                uom_type="zero_based", target_value=Decimal("0"),
                weightage=Decimal("25.00"), display_order=3,
            ),
        ]
        db.add_all(priya_goals)
        await db.flush()

        # Q1 and Q2 check-ins
        checkins = [
            # Q1 check-ins
            CheckIn(goal_id=priya_goals[0].id, quarter="Q1", actual_value=Decimal("18.00"), status="on_track", computed_score=Decimal("72.00"), employee_notes="Good start, optimized CI/CD pipeline."),
            CheckIn(goal_id=priya_goals[1].id, quarter="Q1", actual_value=Decimal("8.00"), status="on_track", computed_score=Decimal("62.50"), employee_notes="Working on reducing edge case bugs."),
            CheckIn(goal_id=priya_goals[2].id, quarter="Q1", status="on_track", employee_notes="Started studying, completed 3 modules."),
            CheckIn(goal_id=priya_goals[3].id, quarter="Q1", actual_value=Decimal("0"), status="completed", computed_score=Decimal("100.00"), employee_notes="No incidents this quarter."),
            # Q2 check-ins
            CheckIn(goal_id=priya_goals[0].id, quarter="Q2", actual_value=Decimal("22.00"), status="on_track", computed_score=Decimal("88.00"), employee_notes="Significant improvement after process changes."),
            CheckIn(goal_id=priya_goals[1].id, quarter="Q2", actual_value=Decimal("4.00"), status="completed", computed_score=Decimal("125.00"), employee_notes="Below target — great result!"),
            CheckIn(goal_id=priya_goals[2].id, quarter="Q2", status="on_track", employee_notes="Completed 7 of 12 modules. On track."),
            CheckIn(goal_id=priya_goals[3].id, quarter="Q2", actual_value=Decimal("0"), status="completed", computed_score=Decimal("100.00"), employee_notes="Clean record maintained."),
        ]
        db.add_all(checkins)

        # ─── Other Employees' Sheets ─────────────────────────────────
        print("  Creating other employees' goal sheets...")

        statuses = ["draft", "submitted", "submitted", "approved", "draft"]
        for i, emp in enumerate(employees_eng[1:]):
            status = statuses[i] if i < len(statuses) else "draft"
            sheet = GoalSheet(
                employee_id=emp.id, cycle_id=cycle.id,
                status=status,
                submitted_at=datetime(2025, 5, 15) if status != "draft" else None,
                approved_at=datetime(2025, 5, 17) if status == "approved" else None,
                approved_by=manager1.id if status == "approved" else None,
                is_locked=status == "approved",
            )
            db.add(sheet)
            await db.flush()

            # Add 3 goals to each
            for j, (area, title, uom) in enumerate([
                ("Cost Optimization", f"Reduce infrastructure costs by 15%", "percentage_min"),
                ("Customer Satisfaction", f"Achieve 90% customer satisfaction score", "percentage_min"),
                ("Digital Transformation", f"Migrate 3 services to microservices", "numeric_min"),
            ]):
                wt = [40, 30, 30][j]
                goal = Goal(
                    goal_sheet_id=sheet.id, thrust_area=area,
                    title=title, uom_type=uom,
                    target_value=Decimal("15") if j == 0 else Decimal("90") if j == 1 else Decimal("3"),
                    weightage=Decimal(str(wt)), display_order=j,
                )
                db.add(goal)

        # Sales team sheets
        for emp in employees_sales:
            sheet = GoalSheet(
                employee_id=emp.id, cycle_id=cycle.id, status="submitted",
                submitted_at=datetime(2025, 5, 14),
            )
            db.add(sheet)
            await db.flush()
            for j, (area, title) in enumerate([
                ("Revenue Growth", "Close ₹2Cr in new business"),
                ("Customer Satisfaction", "Maintain 95% client retention"),
            ]):
                goal = Goal(
                    goal_sheet_id=sheet.id, thrust_area=area,
                    title=title, uom_type="percentage_min" if j == 1 else "numeric_min",
                    target_value=Decimal("200") if j == 0 else Decimal("95"),
                    weightage=Decimal("50"), display_order=j,
                )
                db.add(goal)

        # ─── Escalation Rules ─────────────────────────────────────────
        print("  Creating escalation rules...")

        rules = [
            EscalationRule(
                name="Goal Not Submitted (7 days)",
                trigger_type="goal_not_submitted",
                days_threshold=7, escalate_to="manager",
                created_by=admin.id,
            ),
            EscalationRule(
                name="Goal Not Approved (5 days)",
                trigger_type="goal_not_approved",
                days_threshold=5, escalate_to="hr",
                created_by=admin.id,
            ),
        ]
        db.add_all(rules)

        await db.commit()

    print("\n[OK] Seed complete! Demo credentials:")
    print("  Admin:    admin@goalflow.com    / Admin@123")
    print("  Manager:  manager@goalflow.com  / Manager@123")
    print("  Employee: employee@goalflow.com / Employee@123")
    print(f"\n  Total: 3 admins/managers + 9 employees = 12 users")
    print(f"  Active Cycle: FY 2025-26")
    print(f"  Priya Sharma: Approved sheet with 4 goals + Q1/Q2 check-ins")


if __name__ == "__main__":
    asyncio.run(seed())
