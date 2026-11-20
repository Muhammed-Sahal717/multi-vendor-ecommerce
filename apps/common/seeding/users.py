from django.utils import timezone

from apps.accounts.models import Address, CustomerProfile, User
from apps.common.seeding.constants import (
    ADMIN_USERS,
    APPLICANT_ACCOUNTS,
    CUSTOMER_USERS,
    DEMO_EMAIL_SUFFIX,
    DEMO_PASSWORD,
    KERALA_LOCATIONS,
    SELLER_ACCOUNTS,
)
from apps.sellers.models import SellerApplication, SellerProfile


def seed_users() -> dict[str, any]:
    """
    Seeds admin/superadmin users, seller accounts (profiles + applications),
    pending/rejected applicants, and 20 customers with profiles and addresses.
    """
    results = {
        "superadmin": None,
        "admin": None,
        "sellers": [],
        "applicants": [],
        "customers": [],
        "addresses": [],
    }

    # 1. Superadmin and Admin
    for admin_data in ADMIN_USERS:
        user, _ = User.objects.get_or_create(
            email=admin_data["email"],
            defaults={
                "first_name": admin_data["first_name"],
                "last_name": admin_data["last_name"],
                "role": admin_data["role"],
                "is_staff": admin_data["is_staff"],
                "is_superuser": admin_data["is_superuser"],
            },
        )
        user.set_password(DEMO_PASSWORD)
        user.is_staff = admin_data["is_staff"]
        user.is_superuser = admin_data["is_superuser"]
        user.role = admin_data["role"]
        user.save()

        if admin_data["is_superuser"]:
            results["superadmin"] = user
        else:
            results["admin"] = user

    superadmin = results["superadmin"]
    admin = results["admin"]

    # 2. Sellers (Applications and Profiles)
    now = timezone.now()
    for seller_data in SELLER_ACCOUNTS:
        seller_user, _ = User.objects.get_or_create(
            email=seller_data["email"],
            defaults={
                "first_name": seller_data["first_name"],
                "last_name": seller_data["last_name"],
                "role": User.Role.SELLER,
                "is_staff": False,
                "is_superuser": False,
            },
        )
        seller_user.set_password(DEMO_PASSWORD)
        seller_user.role = User.Role.SELLER
        seller_user.save()

        # Seller Application (Approved)
        app, _ = SellerApplication.objects.get_or_create(
            user=seller_user,
            defaults={
                "business_name": seller_data["business_name"],
                "business_type": seller_data["business_type"],
                "business_email": seller_data["business_email"],
                "business_phone": seller_data["business_phone"],
                "business_address": seller_data["business_address"],
                "city": seller_data["city"],
                "state": seller_data["state"],
                "postal_code": seller_data["postal_code"],
                "country": seller_data["country"],
                "website": seller_data["website"],
                "description": seller_data["description"],
                "status": SellerApplication.Status.APPROVED,
                "reviewed_by": superadmin,
                "reviewed_at": now,
                "review_notes": "Approved during demo database seeding verification.",
            },
        )

        # Seller Profile
        profile, _ = SellerProfile.objects.get_or_create(
            user=seller_user,
            defaults={
                "business_name": seller_data["business_name"],
                "business_type": seller_data["business_type"],
                "business_email": seller_data["business_email"],
                "business_phone": seller_data["business_phone"],
                "business_address": seller_data["business_address"],
                "city": seller_data["city"],
                "state": seller_data["state"],
                "postal_code": seller_data["postal_code"],
                "country": seller_data["country"],
                "website": seller_data["website"],
                "description": seller_data["description"],
                "status": seller_data["status"],
                "approved_at": now,
            },
        )
        # Update status if already exists
        if profile.status != seller_data["status"]:
            profile.status = seller_data["status"]
            profile.save(update_fields=["status"])

        results["sellers"].append(profile)

    # 3. Applicants (Pending and Rejected)
    for app_data in APPLICANT_ACCOUNTS:
        app_user, _ = User.objects.get_or_create(
            email=app_data["email"],
            defaults={
                "first_name": app_data["first_name"],
                "last_name": app_data["last_name"],
                "role": User.Role.CUSTOMER,
            },
        )
        app_user.set_password(DEMO_PASSWORD)
        app_user.role = User.Role.CUSTOMER
        app_user.save()

        app, _ = SellerApplication.objects.get_or_create(
            user=app_user,
            defaults={
                "business_name": app_data["business_name"],
                "business_type": app_data["business_type"],
                "business_email": app_data["business_email"],
                "business_phone": app_data["business_phone"],
                "business_address": app_data["business_address"],
                "city": app_data["city"],
                "state": app_data["state"],
                "postal_code": app_data["postal_code"],
                "country": "India",
                "status": app_data["status"],
                "reviewed_by": admin if app_data["status"] == "rejected" else None,
                "reviewed_at": now if app_data["status"] == "rejected" else None,
                "review_notes": app_data.get("review_notes", ""),
            },
        )
        results["applicants"].append(app)

    # 4. Customers (20 customers: 18 active, 2 inactive)
    loc_count = len(KERALA_LOCATIONS)
    for idx, cust_data in enumerate(CUSTOMER_USERS, start=1):
        email = f"customer.{cust_data['first_name'].lower()}.{cust_data['last_name'].lower()}{DEMO_EMAIL_SUFFIX}"
        cust_user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": cust_data["first_name"],
                "last_name": cust_data["last_name"],
                "role": User.Role.CUSTOMER,
                "is_active": cust_data["is_active"],
            },
        )
        cust_user.set_password(DEMO_PASSWORD)
        cust_user.first_name = cust_data["first_name"]
        cust_user.last_name = cust_data["last_name"]
        cust_user.role = User.Role.CUSTOMER
        cust_user.is_active = cust_data["is_active"]
        cust_user.save()

        # Ensure CustomerProfile
        profile, _ = CustomerProfile.objects.get_or_create(user=cust_user)
        phone = f"+9198471{idx:05d}"
        if profile.mobile != phone:
            profile.mobile = phone
            profile.save(update_fields=["mobile"])

        # Create Default Address
        loc = KERALA_LOCATIONS[(idx - 1) % loc_count]
        addr, _ = Address.objects.get_or_create(
            user=cust_user,
            is_default=True,
            defaults={
                "full_name": f"{cust_data['first_name']} {cust_data['last_name']}",
                "mobile": phone,
                "address_line_1": loc["address_line_1"],
                "address_line_2": loc["address_line_2"],
                "city": loc["city"],
                "state": loc["state"],
                "postal_code": loc["postal_code"],
                "country": loc["country"],
            },
        )
        results["addresses"].append(addr)

        # For customers 1 to 6, create a secondary non-default address
        if idx <= 6:
            sec_loc = KERALA_LOCATIONS[(idx + 4) % loc_count]
            sec_addr, _ = Address.objects.get_or_create(
                user=cust_user,
                address_line_1=sec_loc["address_line_1"],
                defaults={
                    "full_name": f"{cust_data['first_name']} {cust_data['last_name']} (Office)",
                    "mobile": phone,
                    "address_line_2": sec_loc["address_line_2"],
                    "city": sec_loc["city"],
                    "state": sec_loc["state"],
                    "postal_code": sec_loc["postal_code"],
                    "country": sec_loc["country"],
                    "is_default": False,
                },
            )
            results["addresses"].append(sec_addr)

        results["customers"].append(cust_user)

    return results
