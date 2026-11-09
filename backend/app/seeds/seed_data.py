"""
Master Realistic Seed Data Script for DataStraw RosterIQ
Seeds:
- 5 Operational Pods
- 4-5 Operational Processes (CS, ACC, RET, NDR)
- 10 D2C Brands (8 Single-Resource [80%], 2 Multi-Resource [20%])
- 32 Employees (Codes EMP001 to EMP032, realistic names, designations, weekly off preferences)
- Client-Specific Operating Rules (365 days, Public holidays off, Sundays off)
- Relational Employee Assignments (Primary and Backup allocations)
"""
from datetime import date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import (
    Pod, Employee, EmploymentStatus, Brand, Process,
    BrandProcessRule, OperatingRuleType,
    EmployeeAssignment, AssignmentType,
    PublicHoliday
)


def seed_database(db: Session):
    print("Beginning RosterIQ master database seeding...")

    # 1. SEED PROCESSES
    process_data = [
        {"code": "CS", "name": "Customer Support", "description": "Omnichannel customer queries, live chat, ticketing & email escalation"},
        {"code": "ACC", "name": "Abandoned Cart Conversions", "description": "Outbound WhatsApp, SMS & calling campaigns to recover dropped checkouts"},
        {"code": "RET", "name": "Retention & Loyalty", "description": "VIP customer nurturing, subscription renewals, post-purchase delight & feedback"},
        {"code": "NDR", "name": "Non-Delivery Report Management", "description": "Real-time courier coordination, address verification, RTO reduction"},
    ]
    processes = {}
    for pd in process_data:
        p = db.query(Process).filter(Process.code == pd["code"]).first()
        if not p:
            p = Process(**pd, is_active=True)
            db.add(p)
            db.flush()
        processes[pd["code"]] = p

    # 2. SEED OPERATIONAL PODS
    pod_data = [
        {"code": "POD-LIFESTYLE", "name": "Pod Alpha (Lifestyle & Fashion)", "description": "High-velocity apparel, footwear and accessories operations"},
        {"code": "POD-BEAUTY", "name": "Pod Beta (Beauty & Skincare)", "description": "Premium cosmetics, skincare and wellness D2C accounts"},
        {"code": "POD-FOOD", "name": "Pod Gamma (Food & Gourmet)", "description": "Artisanal food, teas, organic spices and health beverages"},
        {"code": "POD-ELECTRONICS", "name": "Pod Delta (Consumer Electronics)", "description": "Audio, smart home and wearable tech support"},
        {"code": "POD-HOME", "name": "Pod Epsilon (Home & Living)", "description": "Handcrafted furniture, decor and sustainable goods"},
    ]
    pods = {}
    for pdata in pod_data:
        pod = db.query(Pod).filter(Pod.code == pdata["code"]).first()
        if not pod:
            pod = Pod(**pdata, is_active=True)
            db.add(pod)
            db.flush()
        pods[pdata["code"]] = pod

    # 3. SEED 32 REALISTIC EMPLOYEES
    # 5 Pod Leads, Dedicated Single-Resource Agents, Multi-Resource Staff, and Cross-Trained Backups
    employee_records = [
        # Pod Leads (EMP001 - EMP005)
        {"code": "EMP001", "name": "Sneha Sen", "email": "sneha.sen@datastraw.io", "designation": "Operations Lead (Pod Alpha)", "pod": "POD-LIFESTYLE", "off": "Sunday"},
        {"code": "EMP002", "name": "Rajesh Nair", "email": "rajesh.nair@datastraw.io", "designation": "Operations Lead (Pod Beta)", "pod": "POD-BEAUTY", "off": "Sunday"},
        {"code": "EMP003", "name": "Ananya Roy", "email": "ananya.roy@datastraw.io", "designation": "Operations Lead (Pod Gamma)", "pod": "POD-FOOD", "off": "Sunday"},
        {"code": "EMP004", "name": "Karthik Iyer", "email": "karthik.iyer@datastraw.io", "designation": "Operations Lead (Pod Delta)", "pod": "POD-ELECTRONICS", "off": "Sunday"},
        {"code": "EMP005", "name": "Tanvi Kulkarni", "email": "tanvi.kulkarni@datastraw.io", "designation": "Operations Lead (Pod Epsilon)", "pod": "POD-HOME", "off": "Sunday"},

        # Single-Resource Brand Dedicated Specialists (EMP006 - EMP013) - 80% staffing pattern
        {"code": "EMP006", "name": "Priya Sharma", "email": "priya.sharma@datastraw.io", "designation": "Senior Operations Specialist", "pod": "POD-BEAUTY", "off": "Sunday"},
        {"code": "EMP007", "name": "Amit Verma", "email": "amit.verma@datastraw.io", "designation": "Operations Specialist", "pod": "POD-FOOD", "off": "Monday"},
        {"code": "EMP008", "name": "Neha Kapoor", "email": "neha.kapoor@datastraw.io", "designation": "Customer Experience Executive", "pod": "POD-FOOD", "off": "Sunday"},
        {"code": "EMP009", "name": "Siddharth Jain", "email": "siddharth.jain@datastraw.io", "designation": "Operations Specialist", "pod": "POD-FOOD", "off": "Tuesday"},
        {"code": "EMP010", "name": "Pooja Reddy", "email": "pooja.reddy@datastraw.io", "designation": "Customer Delight Associate", "pod": "POD-LIFESTYLE", "off": "Sunday"},
        {"code": "EMP011", "name": "Gaurav Joshi", "email": "gaurav.joshi@datastraw.io", "designation": "Operations Specialist", "pod": "POD-HOME", "off": "Sunday"},
        {"code": "EMP012", "name": "Meera Pillai", "email": "meera.pillai@datastraw.io", "designation": "Customer Experience Specialist", "pod": "POD-ELECTRONICS", "off": "Saturday"},
        {"code": "EMP013", "name": "Arjun Das", "email": "arjun.das@datastraw.io", "designation": "Operations Specialist", "pod": "POD-LIFESTYLE", "off": "Sunday"},

        # Multi-Resource Brand Staff (EMP014 - EMP021) - UrbanKicks & BellaAura
        {"code": "EMP014", "name": "Aditya Kulkarni", "email": "aditya.kulkarni@datastraw.io", "designation": "Senior Support Specialist", "pod": "POD-LIFESTYLE", "off": "Sunday"},
        {"code": "EMP015", "name": "Kavya Menon", "email": "kavya.menon@datastraw.io", "designation": "Support Specialist", "pod": "POD-LIFESTYLE", "off": "Wednesday"},
        {"code": "EMP016", "name": "Rakesh Bhatia", "email": "rakesh.bhatia@datastraw.io", "designation": "Conversion Specialist (ACC)", "pod": "POD-LIFESTYLE", "off": "Sunday"},
        {"code": "EMP017", "name": "Divya Saxena", "email": "divya.saxena@datastraw.io", "designation": "Logistics & NDR Analyst", "pod": "POD-LIFESTYLE", "off": "Tuesday"},
        {"code": "EMP018", "name": "Manish Pandey", "email": "manish.pandey@datastraw.io", "designation": "Senior Support Executive", "pod": "POD-BEAUTY", "off": "Sunday"},
        {"code": "EMP019", "name": "Shruti Mishra", "email": "shruti.mishra@datastraw.io", "designation": "Cart Recovery Associate", "pod": "POD-BEAUTY", "off": "Thursday"},
        {"code": "EMP020", "name": "Harish Venkat", "email": "harish.venkat@datastraw.io", "designation": "Retention Executive", "pod": "POD-BEAUTY", "off": "Friday"},
        {"code": "EMP021", "name": "Sunita Rao", "email": "sunita.rao@datastraw.io", "designation": "NDR Specialist", "pod": "POD-BEAUTY", "off": "Sunday"},

        # Floating Operational Backups & Pod Cross-Cover Resources (EMP022 - EMP032)
        {"code": "EMP022", "name": "Varun Chopra", "email": "varun.chopra@datastraw.io", "designation": "Associate Operations Analyst", "pod": "POD-LIFESTYLE", "off": "Monday"},
        {"code": "EMP023", "name": "Isha Singhal", "email": "isha.singhal@datastraw.io", "designation": "Customer Service Associate", "pod": "POD-BEAUTY", "off": "Tuesday"},
        {"code": "EMP024", "name": "Deepak Mehta", "email": "deepak.mehta@datastraw.io", "designation": "Operations Associate", "pod": "POD-FOOD", "off": "Wednesday"},
        {"code": "EMP025", "name": "Rhea Fernandes", "email": "rhea.fernandes@datastraw.io", "designation": "Support Associate", "pod": "POD-ELECTRONICS", "off": "Thursday"},
        {"code": "EMP026", "name": "Kunal Goswami", "email": "kunal.goswami@datastraw.io", "designation": "Operations Associate", "pod": "POD-HOME", "off": "Friday"},
        {"code": "EMP027", "name": "Nandini Ghosh", "email": "nandini.ghosh@datastraw.io", "designation": "Quality & Support Associate", "pod": "POD-LIFESTYLE", "off": "Saturday"},
        {"code": "EMP028", "name": "Sameer Khan", "email": "sameer.khan@datastraw.io", "designation": "Operations Associate", "pod": "POD-BEAUTY", "off": "Sunday"},
        {"code": "EMP029", "name": "Tarun Ahuja", "email": "tarun.ahuja@datastraw.io", "designation": "Support Associate", "pod": "POD-FOOD", "off": "Rotational"},
        {"code": "EMP030", "name": "Prachi Deshmukh", "email": "prachi.deshmukh@datastraw.io", "designation": "Operations Associate", "pod": "POD-ELECTRONICS", "off": "Sunday"},
        {"code": "EMP031", "name": "Nikhil Agarwal", "email": "nikhil.agarwal@datastraw.io", "designation": "Operations Associate", "pod": "POD-HOME", "off": "Sunday"},
        {"code": "EMP032", "name": "Ananya Basu", "email": "ananya.basu@datastraw.io", "designation": "Operations Associate", "pod": "POD-LIFESTYLE", "off": "Monday"},
    ]

    employees = {}
    for edata in employee_records:
        emp = db.query(Employee).filter(Employee.employee_code == edata["code"]).first()
        if not emp:
            emp = Employee(
                employee_code=edata["code"],
                full_name=edata["name"],
                email=edata["email"],
                designation=edata["designation"],
                pod_id=pods[edata["pod"]].id,
                employment_status=EmploymentStatus.ACTIVE,
                default_off_pref=edata["off"],
                joining_date=date(2025, 1, 15),
                is_active=True,
            )
            db.add(emp)
            db.flush()
        employees[edata["code"]] = emp

    # Link Pod Leads
    pods["POD-LIFESTYLE"].pod_lead_id = employees["EMP001"].id
    pods["POD-BEAUTY"].pod_lead_id = employees["EMP002"].id
    pods["POD-FOOD"].pod_lead_id = employees["EMP003"].id
    pods["POD-ELECTRONICS"].pod_lead_id = employees["EMP004"].id
    pods["POD-HOME"].pod_lead_id = employees["EMP005"].id
    db.flush()

    # 4. SEED 10 D2C BRANDS
    # 8 Single-Resource Brands (80%) + 2 Multi-Resource Brands (20%)
    brands_data = [
        # Single-Resource Brands
        {"code": "BRD-GLOW", "name": "GlowBotanics", "client": "Glow Botanics Naturals Ltd.", "pod": "POD-BEAUTY", "single": True, "lead_emp": "EMP006"},
        {"code": "BRD-CHAI", "name": "ChaiCraft", "client": "ChaiCraft Beverages LLP", "pod": "POD-FOOD", "single": True, "lead_emp": "EMP007"},
        {"code": "BRD-FIT", "name": "FitFuel Nutrition", "client": "FitFuel Wellness Pvt. Ltd.", "pod": "POD-FOOD", "single": True, "lead_emp": "EMP008"},
        {"code": "BRD-SPICE", "name": "SpiceTrail Organics", "client": "SpiceTrail India Corp", "pod": "POD-FOOD", "single": True, "lead_emp": "EMP009"},
        {"code": "BRD-SILK", "name": "PureSilk Apparel", "client": "PureSilk Fashion Group", "pod": "POD-LIFESTYLE", "single": True, "lead_emp": "EMP010"},
        {"code": "BRD-ZEN", "name": "ZenLiving Decor", "client": "ZenLiving Lifestyle LLP", "pod": "POD-HOME", "single": True, "lead_emp": "EMP011"},
        {"code": "BRD-PULSE", "name": "PulseAudio", "client": "Pulse Audio Acoustics", "pod": "POD-ELECTRONICS", "single": True, "lead_emp": "EMP012"},
        {"code": "BRD-VELVET", "name": "VelvetVogue", "client": "Velvet Vogue Retail", "pod": "POD-LIFESTYLE", "single": True, "lead_emp": "EMP013"},

        # Multi-Resource Brands (High Volume)
        {"code": "BRD-URBAN", "name": "UrbanKicks", "client": "Urban Kicks Footwear Pvt.", "pod": "POD-LIFESTYLE", "single": False, "lead_emp": None},
        {"code": "BRD-BELLA", "name": "BellaAura Cosmetics", "client": "BellaAura Beauty Global", "pod": "POD-BEAUTY", "single": False, "lead_emp": None},
    ]

    brands = {}
    for bd in brands_data:
        brand = db.query(Brand).filter(Brand.code == bd["code"]).first()
        if not brand:
            brand = Brand(
                code=bd["code"],
                name=bd["name"],
                client_name=bd["client"],
                pod_id=pods[bd["pod"]].id,
                is_active=True,
                notes="Single Dedicated Agent" if bd["single"] else "Multi-Resource Operational Brand",
            )
            db.add(brand)
            db.flush()
        brands[bd["code"]] = brand

    # 5. SEED BRAND PROCESS OPERATING RULES & CALENDARS
    # GlowBotanics: CS requires 365-DAY coverage! ACC/RET/NDR require standard operating days.
    # UrbanKicks: CS requires 365-DAY coverage with min headcount 2!
    for b_code, brand in brands.items():
        # CS rule
        cs_rule_type = OperatingRuleType.EVERY_DAY_365 if b_code in ["BRD-GLOW", "BRD-URBAN", "BRD-PULSE"] else OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS
        operates_sun = True if cs_rule_type == OperatingRuleType.EVERY_DAY_365 else False
        operates_hol = True if cs_rule_type == OperatingRuleType.EVERY_DAY_365 else False
        min_hc = 2 if b_code == "BRD-URBAN" else 1

        existing_cs_rule = db.query(BrandProcessRule).filter_by(brand_id=brand.id, process_id=processes["CS"].id).first()
        if not existing_cs_rule:
            db.add(BrandProcessRule(
                brand_id=brand.id,
                process_id=processes["CS"].id,
                rule_type=cs_rule_type,
                min_headcount=min_hc,
                operates_sunday=operates_sun,
                operates_holidays=operates_hol,
                shift_start_time="09:00",
                shift_end_time="18:00",
            ))

        # ACC rule
        existing_acc = db.query(BrandProcessRule).filter_by(brand_id=brand.id, process_id=processes["ACC"].id).first()
        if not existing_acc:
            db.add(BrandProcessRule(
                brand_id=brand.id,
                process_id=processes["ACC"].id,
                rule_type=OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS,
                min_headcount=1,
                operates_sunday=False,
                operates_holidays=False,
            ))

        # RET rule
        existing_ret = db.query(BrandProcessRule).filter_by(brand_id=brand.id, process_id=processes["RET"].id).first()
        if not existing_ret:
            db.add(BrandProcessRule(
                brand_id=brand.id,
                process_id=processes["RET"].id,
                rule_type=OperatingRuleType.EXCEPT_PUBLIC_HOLIDAYS,
                min_headcount=1,
                operates_sunday=False,
                operates_holidays=False,
            ))

        # NDR rule
        existing_ndr = db.query(BrandProcessRule).filter_by(brand_id=brand.id, process_id=processes["NDR"].id).first()
        if not existing_ndr:
            db.add(BrandProcessRule(
                brand_id=brand.id,
                process_id=processes["NDR"].id,
                rule_type=OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS,
                min_headcount=1,
                operates_sunday=False,
                operates_holidays=False,
            ))

    db.flush()

    # 6. SEED RESOURCE ALLOCATIONS (EmployeeAssignments)
    # A) 8 Single-Resource Brands: 1 Employee assigned as PRIMARY to ALL processes for that brand!
    for bd in brands_data:
        if bd["single"] and bd["lead_emp"]:
            emp = employees[bd["lead_emp"]]
            brand = brands[bd["code"]]
            for proc_code in ["CS", "ACC", "RET", "NDR"]:
                existing_alloc = db.query(EmployeeAssignment).filter_by(
                    employee_id=emp.id, brand_id=brand.id, process_id=processes[proc_code].id
                ).first()
                if not existing_alloc:
                    db.add(EmployeeAssignment(
                        employee_id=emp.id,
                        brand_id=brand.id,
                        process_id=processes[proc_code].id,
                        assignment_type=AssignmentType.PRIMARY,
                        is_active=True,
                    ))

    # B) Multi-Resource Brands:
    # UrbanKicks:
    uk = brands["BRD-URBAN"]
    uk_allocations = [
        ("EMP014", "CS", AssignmentType.PRIMARY),
        ("EMP015", "CS", AssignmentType.PRIMARY),
        ("EMP016", "ACC", AssignmentType.PRIMARY),
        ("EMP017", "NDR", AssignmentType.PRIMARY),
        ("EMP022", "CS", AssignmentType.BACKUP),  # Backup agent from same pod
    ]
    for emp_code, proc_code, a_type in uk_allocations:
        emp = employees[emp_code]
        if not db.query(EmployeeAssignment).filter_by(employee_id=emp.id, brand_id=uk.id, process_id=processes[proc_code].id).first():
            db.add(EmployeeAssignment(
                employee_id=emp.id,
                brand_id=uk.id,
                process_id=processes[proc_code].id,
                assignment_type=a_type,
                is_active=True,
            ))

    # BellaAura Cosmetics:
    ba = brands["BRD-BELLA"]
    ba_allocations = [
        ("EMP018", "CS", AssignmentType.PRIMARY),
        ("EMP019", "ACC", AssignmentType.PRIMARY),
        ("EMP020", "RET", AssignmentType.PRIMARY),
        ("EMP021", "NDR", AssignmentType.PRIMARY),
        ("EMP023", "CS", AssignmentType.BACKUP),  # Backup agent from same pod
    ]
    for emp_code, proc_code, a_type in ba_allocations:
        emp = employees[emp_code]
        if not db.query(EmployeeAssignment).filter_by(employee_id=emp.id, brand_id=ba.id, process_id=processes[proc_code].id).first():
            db.add(EmployeeAssignment(
                employee_id=emp.id,
                brand_id=ba.id,
                process_id=processes[proc_code].id,
                assignment_type=a_type,
                is_active=True,
            ))

    # C) Designated Cross-Trained Backups for single-resource brands within pods:
    # EMP022 (Pod Lifestyle) is backup for PureSilk & VelvetVogue
    for b_code in ["BRD-SILK", "BRD-VELVET"]:
        for proc in ["CS", "ACC"]:
            db.add(EmployeeAssignment(
                employee_id=employees["EMP022"].id,
                brand_id=brands[b_code].id,
                process_id=processes[proc].id,
                assignment_type=AssignmentType.BACKUP,
                is_active=True,
            ))

    # EMP023 (Pod Beauty) is backup for GlowBotanics
    for proc in ["CS", "ACC", "RET", "NDR"]:
        db.add(EmployeeAssignment(
            employee_id=employees["EMP023"].id,
            brand_id=brands["BRD-GLOW"].id,
            process_id=processes[proc].id,
            assignment_type=AssignmentType.BACKUP,
            is_active=True,
        ))

    # 7. SEED PUBLIC HOLIDAYS (Current Year / Month calendar)
    holidays_data = [
        {"date": date(2026, 1, 26), "name": "Republic Day"},
        {"date": date(2026, 3, 25), "name": "Holi"},
        {"date": date(2026, 4, 14), "name": "Ambedkar Jayanti"},
        {"date": date(2026, 8, 15), "name": "Independence Day"},
        {"date": date(2026, 10, 2), "name": "Gandhi Jayanti"},
        {"date": date(2026, 11, 1), "name": "Kannada Rajyotsava"},
        {"date": date(2026, 11, 12), "name": "Diwali (Deepavali)"},
        {"date": date(2026, 11, 24), "name": "Guru Nanak Jayanti"},
        {"date": date(2026, 12, 25), "name": "Christmas"},
    ]
    for h in holidays_data:
        if not db.query(PublicHoliday).filter_by(date=h["date"]).first():
            db.add(PublicHoliday(
                date=h["date"],
                name=h["name"],
                is_national=True,
            ))

    db.commit()

    # Automatically generate initial rosters for current month and assessment demo month
    from app.engine.scheduler import SchedulingEngine
    try:
        SchedulingEngine(db, 11, 2026).generate("November 2026 Master Roster")
        SchedulingEngine(db, 4, 2026).generate("April 2026 Master Roster")
        print("Initial master rosters generated for Nov 2026 & Apr 2026.")
    except Exception as e:
        print(f"Warning: Roster generation during seed failed: {e}")

    print("Database seeding completed successfully!")
    print(f"Total Pods: {db.query(Pod).count()}")
    print(f"Total Processes: {db.query(Process).count()}")
    print(f"Total Brands: {db.query(Brand).count()} (8 single-resource, 2 multi-resource)")
    print(f"Total Employees: {db.query(Employee).count()}")
    print(f"Total Assignments: {db.query(EmployeeAssignment).count()}")
    print(f"Total Operating Rules: {db.query(BrandProcessRule).count()}")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
