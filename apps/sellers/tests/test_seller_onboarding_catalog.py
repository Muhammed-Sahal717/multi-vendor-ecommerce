from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerApplication, SellerProfile

User = get_user_model()


class SellerOnboardingCatalogIntegrationTests(APITestCase):
    """
    End-to-end integration tests for seller onboarding and catalog management.
    Covers the complete lifecycle from seller application, admin review, and seller
    profile creation, through product submission, admin approval, and public catalog
    visibility, along with isolation, permission boundaries, and suspension/reactivation.
    """

    def setUp(self):
        self.password = "StrongPassword123!"

        # Platform Administrator
        self.admin = User.objects.create_user(
            email="admin_onboarding@example.com",
            password=self.password,
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )

        # Active Catalog Category for products
        self.category = Category.objects.create(
            name="Kerala Spices & Condiments",
            description="Locally produced premium spices and condiments.",
            is_active=True,
        )

        # Endpoints
        self.application_create_url = "/api/sellers/applications/"
        self.admin_applications_url = "/api/sellers/admin/applications/"
        self.admin_sellers_url = "/api/sellers/admin/sellers/"
        self.seller_profile_url = "/api/sellers/profile/"
        self.seller_products_url = "/api/catalog/seller/products/"
        self.public_products_url = "/api/catalog/products/"
        self.admin_products_url = "/api/catalog/admin/products/"

    def authenticate_jwt(self, user):
        """Log in via actual project JWT endpoint and set Bearer token header."""
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": user.email,
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Failed to authenticate user {user.email}: {response.data}",
        )
        access_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return access_token

    def clear_credentials(self):
        """Clear client authentication credentials."""
        self.client.credentials()

    # =========================================================================
    # 1. Main End-to-End Workflow (Steps 1 to 5)
    # =========================================================================

    def test_end_to_end_seller_onboarding_and_catalog_workflow(self):
        """
        Comprehensive 5-step integration workflow using real JWT authentication:
        Step 1: Customer submits seller application; duplicate submission rejected.
        Step 2: Admin reviews and approves application; role updated & SellerProfile created.
        Step 3: Newly approved seller authenticates, creates product with initial PENDING status.
        Step 4: Admin reviews and approves product; audit event logged.
        Step 5: Customer / Public views approved product in catalog; unapproved products hidden.
        """
        # ---------------------------------------------------------------------
        # Step 1 — Seller application submission
        # ---------------------------------------------------------------------
        customer = User.objects.create_user(
            email="calicut_trader@example.com",
            password=self.password,
            first_name="Ahmed",
            last_name="Koya",
            role=User.Role.CUSTOMER,
        )
        self.authenticate_jwt(customer)

        application_payload = {
            "business_name": "Calicut Spice Emporium",
            "business_type": "Wholesale & Retail",
            "business_email": "info@calicutspice.com",
            "business_phone": "9847123456",
            "business_address": "45 Big Bazaar Road",
            "city": "Calicut",
            "state": "Kerala",
            "postal_code": "673001",
            "country": "India",
            "website": "https://calicutspice.example.com",
            "description": "Exporters and retailers of authentic Malabar black pepper and cardamom.",
        }

        # Submit application
        submit_resp = self.client.post(
            self.application_create_url,
            application_payload,
            format="json",
        )
        self.assertEqual(submit_resp.status_code, status.HTTP_201_CREATED)
        app_id = submit_resp.data["id"]
        self.assertEqual(submit_resp.data["status"], "pending")
        self.assertEqual(submit_resp.data["business_name"], "Calicut Spice Emporium")

        # Verify DB persistence and initial status
        application = SellerApplication.objects.get(id=app_id)
        self.assertEqual(application.user, customer)
        self.assertEqual(application.status, SellerApplication.Status.PENDING)
        self.assertIsNone(application.reviewed_at)

        # Verify audit event for application submission
        app_submitted_audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_APPLICATION_SUBMITTED,
            entity_type=AuditEntity.SELLER_APPLICATION,
            entity_id=application.id,
        ).first()
        self.assertIsNotNone(app_submitted_audit)
        self.assertEqual(app_submitted_audit.actor, customer)

        # Verify duplicate application is rejected under business rules
        duplicate_resp = self.client.post(
            self.application_create_url,
            application_payload,
            format="json",
        )
        self.assertEqual(duplicate_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", duplicate_resp.data)

        # ---------------------------------------------------------------------
        # Step 2 — Admin reviews and approves application
        # ---------------------------------------------------------------------
        self.authenticate_jwt(self.admin)

        # Admin lists applications and locates the submitted application
        admin_list_resp = self.client.get(self.admin_applications_url)
        self.assertEqual(admin_list_resp.status_code, status.HTTP_200_OK)
        application_ids = [app["id"] for app in admin_list_resp.data]
        self.assertIn(str(app_id), application_ids)

        # Admin approves application
        review_url = f"{self.admin_applications_url}{app_id}/review/"
        review_resp = self.client.patch(
            review_url,
            {
                "status": "approved",
                "review_notes": "All trade licenses and GST registrations verified.",
            },
            format="json",
        )
        self.assertEqual(review_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(review_resp.data["status"], "approved")
        self.assertEqual(review_resp.data["review_notes"], "All trade licenses and GST registrations verified.")

        # Verify application status change and reviewer metadata in DB
        application.refresh_from_db()
        self.assertEqual(application.status, SellerApplication.Status.APPROVED)
        self.assertEqual(application.reviewed_by, self.admin)
        self.assertIsNotNone(application.reviewed_at)

        # Verify user role updated to SELLER
        customer.refresh_from_db()
        self.assertEqual(customer.role, User.Role.SELLER)

        # Verify seller profile created and activated
        seller_profile = SellerProfile.objects.get(user=customer)
        self.assertEqual(seller_profile.status, SellerProfile.Status.ACTIVE)
        self.assertEqual(seller_profile.business_name, "Calicut Spice Emporium")
        self.assertIsNotNone(seller_profile.approved_at)

        # Verify audit event for approval
        app_approved_audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_APPLICATION_APPROVED,
            entity_type=AuditEntity.SELLER_APPLICATION,
            entity_id=application.id,
        ).first()
        self.assertIsNotNone(app_approved_audit)
        self.assertEqual(app_approved_audit.actor, self.admin)

        # ---------------------------------------------------------------------
        # Step 3 — Seller creates a product
        # ---------------------------------------------------------------------
        # Authenticate with fresh JWT as the newly approved seller
        self.authenticate_jwt(customer)

        # Verify seller profile endpoint is accessible
        profile_resp = self.client.get(self.seller_profile_url)
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_resp.data["business_name"], "Calicut Spice Emporium")
        self.assertEqual(profile_resp.data["status"], "active")

        # Seller submits a new product
        product_payload = {
            "category": str(self.category.id),
            "name": "Wayanad Green Cardamom 250g",
            "sku": "WYN-CRD-250G",
            "description": "Premium grade bold green cardamom harvested from Wayanad estates.",
            "price": "450.00",
            "stock": 100,
        }
        create_prod_resp = self.client.post(
            self.seller_products_url,
            product_payload,
            format="json",
        )
        self.assertEqual(create_prod_resp.status_code, status.HTTP_201_CREATED)
        product_slug = create_prod_resp.data["slug"]
        self.assertEqual(create_prod_resp.data["status"], "pending")
        self.assertEqual(create_prod_resp.data["seller_name"], "Calicut Spice Emporium")
        self.assertEqual(create_prod_resp.data["category_name"], "Kerala Spices & Condiments")
        self.assertEqual(create_prod_resp.data["price"], "450.00")
        self.assertEqual(create_prod_resp.data["stock"], 100)

        # Verify DB product record
        product = Product.objects.get(slug=product_slug)
        self.assertEqual(product.seller, seller_profile)
        self.assertEqual(product.category, self.category)
        self.assertEqual(product.status, Product.Status.PENDING)
        self.assertTrue(product.is_active)

        # Verify seller can retrieve and inspect own product
        seller_get_resp = self.client.get(f"{self.seller_products_url}{product_slug}/")
        self.assertEqual(seller_get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_get_resp.data["sku"], "WYN-CRD-250G")

        # Verify audit event for product creation
        prod_created_audit = AuditEvent.objects.filter(
            action=AuditAction.PRODUCT_CREATED,
            entity_type=AuditEntity.PRODUCT,
            entity_id=product.id,
        ).first()
        self.assertIsNotNone(prod_created_audit)
        self.assertEqual(prod_created_audit.actor, customer)

        # ---------------------------------------------------------------------
        # Step 4 — Admin approves product
        # ---------------------------------------------------------------------
        self.authenticate_jwt(self.admin)

        # Admin retrieves pending products
        pending_list_resp = self.client.get(f"{self.admin_products_url}?status=pending")
        self.assertEqual(pending_list_resp.status_code, status.HTTP_200_OK)
        pending_slugs = [p["slug"] for p in pending_list_resp.data]
        self.assertIn(product_slug, pending_slugs)

        # Admin approves the product
        prod_review_url = f"{self.admin_products_url}{product_slug}/review/"
        prod_review_resp = self.client.patch(
            prod_review_url,
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(prod_review_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(prod_review_resp.data["status"], "approved")

        # Verify DB status updated
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.APPROVED)

        # Verify audit event for product approval
        prod_approved_audit = AuditEvent.objects.filter(
            action=AuditAction.PRODUCT_APPROVED,
            entity_type=AuditEntity.PRODUCT,
            entity_id=product.id,
        ).first()
        self.assertIsNotNone(prod_approved_audit)
        self.assertEqual(prod_approved_audit.actor, self.admin)

        # ---------------------------------------------------------------------
        # Step 5 — Public catalog visibility
        # ---------------------------------------------------------------------
        # Clear authentication credentials (anonymous public visitor)
        self.clear_credentials()

        # Public catalog list must show the approved product
        pub_list_resp = self.client.get(self.public_products_url)
        self.assertEqual(pub_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_list_resp.data["count"], 1)
        public_item = pub_list_resp.data["results"][0]
        self.assertEqual(public_item["slug"], product_slug)
        self.assertEqual(public_item["name"], "Wayanad Green Cardamom 250g")
        self.assertEqual(public_item["price"], "450.00")
        self.assertEqual(public_item["seller_name"], "Calicut Spice Emporium")
        self.assertEqual(public_item["category_name"], "Kerala Spices & Condiments")

        # Public catalog detail must return product details
        pub_detail_resp = self.client.get(f"{self.public_products_url}{product_slug}/")
        self.assertEqual(pub_detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_detail_resp.data["sku"], "WYN-CRD-250G")
        self.assertEqual(pub_detail_resp.data["stock"], 100)

        # Create a second product left as PENDING to verify unapproved products are hidden
        self.authenticate_jwt(customer)
        pending_prod_resp = self.client.post(
            self.seller_products_url,
            {
                "category": str(self.category.id),
                "name": "Malabar White Pepper 100g",
                "sku": "MLB-WHT-100G",
                "description": "De-husked creamy white pepper peppercorns.",
                "price": "220.00",
                "stock": 50,
            },
            format="json",
        )
        self.assertEqual(pending_prod_resp.status_code, status.HTTP_201_CREATED)
        pending_slug = pending_prod_resp.data["slug"]

        # Public catalog must still only show the 1 approved product, hiding the pending one
        self.clear_credentials()
        pub_list_resp2 = self.client.get(self.public_products_url)
        self.assertEqual(pub_list_resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_list_resp2.data["count"], 1)
        self.assertEqual(pub_list_resp2.data["results"][0]["slug"], product_slug)

        # Direct public detail access to pending product returns 404
        pub_pending_detail = self.client.get(f"{self.public_products_url}{pending_slug}/")
        self.assertEqual(pub_pending_detail.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================================
    # 2. Seller Access Boundaries & Administrative Isolation
    # =========================================================================

    def test_seller_access_boundaries_and_administrative_isolation(self):
        """
        Verifies:
        1. A seller cannot view or modify another seller's products (404 Not Found).
        2. A seller cannot access admin endpoints for sellers or catalog (403 Forbidden).
        3. Regular customers cannot access seller management endpoints (403 Forbidden).
        """
        # Create Seller A
        user_a = User.objects.create_user(
            email="seller_alpha@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        seller_a = SellerProfile.objects.create(
            user=user_a,
            business_name="Alpha Spices",
            business_type="Retail",
            business_email="alpha@example.com",
            business_phone="9847111111",
            business_address="10 Alpha St",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )
        product_a = Product.objects.create(
            seller=seller_a,
            category=self.category,
            name="Alpha Nutmeg 100g",
            sku="SKU-NUTMEG-01",
            description="Organic nutmeg",
            price=Decimal("180.00"),
            stock=40,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Create Seller B
        user_b = User.objects.create_user(
            email="seller_beta@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        seller_b = SellerProfile.objects.create(
            user=user_b,
            business_name="Beta Organics",
            business_type="Retail",
            business_email="beta@example.com",
            business_phone="9847222222",
            business_address="20 Beta St",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )
        product_b = Product.objects.create(
            seller=seller_b,
            category=self.category,
            name="Beta Clove 50g",
            sku="SKU-CLOVE-02",
            description="High oil content cloves",
            price=Decimal("95.00"),
            stock=60,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Authenticate as Seller A
        self.authenticate_jwt(user_a)

        # Seller A cannot access Seller B's product detail (404 Not Found)
        other_detail_resp = self.client.get(f"{self.seller_products_url}{product_b.slug}/")
        self.assertEqual(other_detail_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Seller A cannot update Seller B's product (404 Not Found)
        other_patch_resp = self.client.patch(
            f"{self.seller_products_url}{product_b.slug}/",
            {"price": "199.00"},
            format="json",
        )
        self.assertEqual(other_patch_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Seller A cannot access administrative seller endpoints (403 Forbidden)
        admin_endpoints = [
            ("get", self.admin_applications_url),
            ("get", self.admin_sellers_url),
            ("get", f"{self.admin_sellers_url}{seller_b.id}/"),
            ("patch", f"{self.admin_sellers_url}{seller_b.id}/status/"),
            ("get", self.admin_products_url),
            ("patch", f"{self.admin_products_url}{product_b.slug}/review/"),
        ]
        for method, endpoint in admin_endpoints:
            if method == "get":
                resp = self.client.get(endpoint)
            else:
                resp = self.client.patch(endpoint, {"status": "suspended"}, format="json")
            self.assertEqual(
                resp.status_code,
                status.HTTP_403_FORBIDDEN,
                f"Seller A was not denied access to admin endpoint {endpoint} (got {resp.status_code})",
            )

        # Customer attempts to access seller endpoints (403 Forbidden)
        customer = User.objects.create_user(
            email="regular_customer@example.com",
            password=self.password,
            role=User.Role.CUSTOMER,
        )
        self.authenticate_jwt(customer)

        customer_seller_endpoints = [
            ("get", self.seller_products_url),
            ("post", self.seller_products_url),
            ("get", f"{self.seller_products_url}{product_a.slug}/"),
            ("get", self.seller_profile_url),
            ("patch", self.seller_profile_url),
        ]
        for method, endpoint in customer_seller_endpoints:
            if method == "get":
                resp = self.client.get(endpoint)
            elif method == "post":
                resp = self.client.post(endpoint, {}, format="json")
            else:
                resp = self.client.patch(endpoint, {}, format="json")
            self.assertEqual(
                resp.status_code,
                status.HTTP_403_FORBIDDEN,
                f"Customer was not denied access to seller endpoint {endpoint} (got {resp.status_code})",
            )

    # =========================================================================
    # 3. Product Visibility Rules & Ownership Immutability
    # =========================================================================

    def test_product_visibility_rules_and_ownership_immutability(self):
        """
        Verifies:
        1. Pending and rejected products remain hidden from public catalog.
        2. Inactive products remain hidden from public catalog.
        3. Sellers cannot approve their own products (400 Bad Request).
        4. Sellers cannot change product ownership through API input (400 Bad Request).
        """
        # Create active seller
        seller_user = User.objects.create_user(
            email="cochin_trader@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        seller = SellerProfile.objects.create(
            user=seller_user,
            business_name="Cochin Spices",
            business_type="Wholesale",
            business_email="contact@cochinspices.com",
            business_phone="9847333333",
            business_address="Marine Drive",
            city="Kochi",
            state="Kerala",
            postal_code="682011",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # Create a second seller for ownership tamper tests
        other_user = User.objects.create_user(
            email="other_seller@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        other_seller = SellerProfile.objects.create(
            user=other_user,
            business_name="Other Trading Co",
            business_type="Retail",
            business_email="other@example.com",
            business_phone="9847444444",
            business_address="MG Road",
            city="Kochi",
            state="Kerala",
            postal_code="682016",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.authenticate_jwt(seller_user)

        # Create pending product
        prod_resp = self.client.post(
            self.seller_products_url,
            {
                "category": str(self.category.id),
                "name": "Kanthari Chilli 100g",
                "sku": "KAN-CHL-100G",
                "description": "Fiery bird's eye chilli from homestead farms.",
                "price": "140.00",
                "stock": 30,
            },
            format="json",
        )
        self.assertEqual(prod_resp.status_code, status.HTTP_201_CREATED)
        prod_slug = prod_resp.data["slug"]

        # Rule 1: Pending products hidden from public catalog
        self.clear_credentials()
        pub_list_resp = self.client.get(self.public_products_url)
        self.assertEqual(pub_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_list_resp.data["count"], 0)

        pub_detail_resp = self.client.get(f"{self.public_products_url}{prod_slug}/")
        self.assertEqual(pub_detail_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Rule 2: Rejected products remain hidden from public catalog
        self.authenticate_jwt(self.admin)
        reject_resp = self.client.patch(
            f"{self.admin_products_url}{prod_slug}/review/",
            {
                "status": "rejected",
                "rejection_reason": "High resolution product imagery required before approval.",
            },
            format="json",
        )
        self.assertEqual(reject_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_resp.data["status"], "rejected")

        # Verify audit event for rejection
        prod_rejected_audit = AuditEvent.objects.filter(
            action=AuditAction.PRODUCT_REJECTED,
            entity_type=AuditEntity.PRODUCT,
            entity_id=prod_resp.data["id"],
        ).first()
        self.assertIsNotNone(prod_rejected_audit)
        self.assertEqual(prod_rejected_audit.actor, self.admin)

        self.clear_credentials()
        pub_list_after_reject = self.client.get(self.public_products_url)
        self.assertEqual(pub_list_after_reject.data["count"], 0)
        pub_detail_after_reject = self.client.get(f"{self.public_products_url}{prod_slug}/")
        self.assertEqual(pub_detail_after_reject.status_code, status.HTTP_404_NOT_FOUND)

        # Rule 3: Approved product made inactive is hidden from public catalog
        self.authenticate_jwt(seller_user)
        prod2_resp = self.client.post(
            self.seller_products_url,
            {
                "category": str(self.category.id),
                "name": "Kashmir Saffron 1g",
                "sku": "KSH-SFR-01G",
                "description": "Pure mongra saffron threads.",
                "price": "650.00",
                "stock": 15,
            },
            format="json",
        )
        self.assertEqual(prod2_resp.status_code, status.HTTP_201_CREATED)
        prod2_slug = prod2_resp.data["slug"]

        # -------------------------------------------------------------
        # Requirement 1: Self-approval attempt on PENDING product
        # -------------------------------------------------------------
        # Owning seller attempts to approve own pending product
        self.authenticate_jwt(seller_user)
        self_approve_resp = self.client.patch(
            f"{self.seller_products_url}{prod2_slug}/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(self_approve_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", self_approve_resp.data)

        # Assert product status in database remains PENDING
        prod2 = Product.objects.get(slug=prod2_slug)
        self.assertEqual(prod2.status, Product.Status.PENDING)

        # -------------------------------------------------------------
        # Requirement 3: Admin product approval response assertions
        # -------------------------------------------------------------
        # Authenticate as platform admin and approve product normally
        self.authenticate_jwt(self.admin)
        admin_approve_resp = self.client.patch(
            f"{self.admin_products_url}{prod2_slug}/review/",
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(admin_approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_approve_resp.data["status"], "approved")

        prod2.refresh_from_db()
        self.assertEqual(prod2.status, Product.Status.APPROVED)

        # Public sees prod2
        self.clear_credentials()
        pub_see_prod2 = self.client.get(self.public_products_url)
        self.assertEqual(pub_see_prod2.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_see_prod2.data["count"], 1)

        # Seller deactivates prod2 (is_active=False)
        self.authenticate_jwt(seller_user)
        deact_resp = self.client.patch(
            f"{self.seller_products_url}{prod2_slug}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deact_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(deact_resp.data["is_active"])

        # Public catalog immediately hides inactive product
        self.clear_credentials()
        pub_inactive_list = self.client.get(self.public_products_url)
        self.assertEqual(pub_inactive_list.data["count"], 0)
        pub_inactive_detail = self.client.get(f"{self.public_products_url}{prod2_slug}/")
        self.assertEqual(pub_inactive_detail.status_code, status.HTTP_404_NOT_FOUND)

        # Reactivate prod2 -> immediately reappears
        self.authenticate_jwt(seller_user)
        react_resp = self.client.patch(
            f"{self.seller_products_url}{prod2_slug}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(react_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(react_resp.data["is_active"])

        self.clear_credentials()
        pub_react_list = self.client.get(self.public_products_url)
        self.assertEqual(pub_react_list.data["count"], 1)

        # Rule 4: Sellers cannot change product ownership through API input
        self.authenticate_jwt(seller_user)
        # Attempt to change ownership on update
        reassign_resp = self.client.patch(
            f"{self.seller_products_url}{prod2_slug}/",
            {"seller": str(other_seller.id)},
            format="json",
        )
        self.assertEqual(reassign_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("seller", reassign_resp.data)

        # Attempt to inject another seller ID on creation
        tamper_create_resp = self.client.post(
            self.seller_products_url,
            {
                "seller": str(other_seller.id),
                "category": str(self.category.id),
                "name": "Tampered Product Name",
                "sku": "TMP-SKU-999",
                "description": "Attempting ownership override",
                "price": "99.00",
                "stock": 5,
            },
            format="json",
        )
        self.assertEqual(tamper_create_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("seller", tamper_create_resp.data)

    # =========================================================================
    # 4. Seller Suspension and Reactivation Lifecycle
    # =========================================================================

    def test_seller_suspension_and_reactivation_lifecycle(self):
        """
        Verifies:
        1. Admin suspends active seller via PATCH /api/sellers/admin/sellers/<pk>/status/.
        2. Suspended seller cannot access active seller endpoints (403 Forbidden).
        3. Suspended seller's products are immediately hidden from public catalog.
        4. Admin reactivates seller via PATCH /api/sellers/admin/sellers/<pk>/status/.
        5. Reactivated seller regains access to active seller endpoints.
        6. Active approved products immediately reappear in public catalog.
        7. Inactive products remain hidden according to existing activation rules.
        """
        # Create active seller
        seller_user = User.objects.create_user(
            email="wayanad_plantation@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        seller = SellerProfile.objects.create(
            user=seller_user,
            business_name="Wayanad Organic Estates",
            business_type="Wholesale",
            business_email="estates@wayanad.example.com",
            business_phone="9847555555",
            business_address="Meppadi Estate",
            city="Wayanad",
            state="Kerala",
            postal_code="673577",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # Active, approved product (Product 1)
        active_product = Product.objects.create(
            seller=seller,
            category=self.category,
            name="Estate Robusta Coffee 500g",
            sku="WYN-COF-500G",
            description="High altitude shade-grown single origin robusta beans.",
            price=Decimal("320.00"),
            stock=80,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Inactive, approved product (Product 2)
        inactive_product = Product.objects.create(
            seller=seller,
            category=self.category,
            name="Estate Ginger Dried 200g",
            sku="WYN-GNG-200G",
            description="Sun-dried unbleached ginger rhizomes.",
            price=Decimal("160.00"),
            stock=40,
            status=Product.Status.APPROVED,
            is_active=False,
        )

        # Baseline: Public catalog shows Product 1, hides Product 2
        self.clear_credentials()
        initial_pub_resp = self.client.get(self.public_products_url)
        self.assertEqual(initial_pub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(initial_pub_resp.data["count"], 1)
        self.assertEqual(initial_pub_resp.data["results"][0]["slug"], active_product.slug)

        # Baseline: Seller can access own products and profile
        self.authenticate_jwt(seller_user)
        seller_list_resp = self.client.get(self.seller_products_url)
        self.assertEqual(seller_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_list_resp.data["count"], 2)

        profile_check = self.client.get(self.seller_profile_url)
        self.assertEqual(profile_check.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_check.data["status"], "active")

        # ---------------------------------------------------------------------
        # Admin suspends the seller
        # ---------------------------------------------------------------------
        self.authenticate_jwt(self.admin)
        status_url = f"{self.admin_sellers_url}{seller.id}/status/"
        suspend_resp = self.client.patch(
            status_url,
            {
                "status": "suspended",
                "reason": "Pending compliance audit on organic certification documents.",
            },
            format="json",
        )
        self.assertEqual(suspend_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(suspend_resp.data["status"], "suspended")

        # Verify DB status
        seller.refresh_from_db()
        self.assertEqual(seller.status, SellerProfile.Status.SUSPENDED)

        # Verify SELLER_SUSPENDED audit event
        suspend_audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_SUSPENDED,
            entity_type=AuditEntity.SELLER,
            entity_id=seller.id,
        ).first()
        self.assertIsNotNone(suspend_audit)
        self.assertEqual(suspend_audit.actor, self.admin)
        self.assertEqual(suspend_audit.metadata["old_status"], "active")
        self.assertEqual(suspend_audit.metadata["new_status"], "suspended")

        # Suspended seller cannot access active seller endpoints
        self.authenticate_jwt(seller_user)

        # List products -> 403 Forbidden
        self.assertEqual(
            self.client.get(self.seller_products_url).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        # Create product -> 403 Forbidden
        self.assertEqual(
            self.client.post(
                self.seller_products_url,
                {
                    "category": str(self.category.id),
                    "name": "New Product Attempt",
                    "sku": "NEW-ATT-001",
                    "price": "100.00",
                    "stock": 10,
                },
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        # Profile view -> 403 Forbidden
        self.assertEqual(
            self.client.get(self.seller_profile_url).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Suspended seller's products are immediately hidden from public catalog
        self.clear_credentials()
        pub_during_suspension = self.client.get(self.public_products_url)
        self.assertEqual(pub_during_suspension.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_during_suspension.data["count"], 0)

        pub_detail_during_suspension = self.client.get(
            f"{self.public_products_url}{active_product.slug}/"
        )
        self.assertEqual(
            pub_detail_during_suspension.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # ---------------------------------------------------------------------
        # Admin reactivates the seller
        # ---------------------------------------------------------------------
        self.authenticate_jwt(self.admin)
        reactivate_resp = self.client.patch(
            status_url,
            {
                "status": "active",
                "reason": "Organic certification verified with regulatory authority.",
            },
            format="json",
        )
        self.assertEqual(reactivate_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reactivate_resp.data["status"], "active")

        # Verify DB status
        seller.refresh_from_db()
        self.assertEqual(seller.status, SellerProfile.Status.ACTIVE)

        # Verify SELLER_REACTIVATED audit event
        react_audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_REACTIVATED,
            entity_type=AuditEntity.SELLER,
            entity_id=seller.id,
        ).first()
        self.assertIsNotNone(react_audit)
        self.assertEqual(react_audit.actor, self.admin)
        self.assertEqual(react_audit.metadata["old_status"], "suspended")
        self.assertEqual(react_audit.metadata["new_status"], "active")

        # Reactivated seller regains access to active seller endpoints
        self.authenticate_jwt(seller_user)
        seller_list_after = self.client.get(self.seller_products_url)
        self.assertEqual(seller_list_after.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_list_after.data["count"], 2)

        profile_after = self.client.get(self.seller_profile_url)
        self.assertEqual(profile_after.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_after.data["status"], "active")

        # Public catalog visibility restored:
        # Active approved product 1 reappears; inactive product 2 remains hidden
        self.clear_credentials()
        pub_after_react = self.client.get(self.public_products_url)
        self.assertEqual(pub_after_react.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_after_react.data["count"], 1)
        self.assertEqual(pub_after_react.data["results"][0]["slug"], active_product.slug)

        pub_prod1_detail = self.client.get(f"{self.public_products_url}{active_product.slug}/")
        self.assertEqual(pub_prod1_detail.status_code, status.HTTP_200_OK)

        pub_prod2_detail = self.client.get(f"{self.public_products_url}{inactive_product.slug}/")
        self.assertEqual(pub_prod2_detail.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================================
    # 5. Seller Application Validation & Eligibility Rules
    # =========================================================================

    def test_seller_application_validation_and_eligibility(self):
        """
        Verifies:
        1. Non-customer (e.g. platform admin or existing seller) cannot apply.
        2. Unauthenticated application submission is rejected (401 Unauthorized).
        3. Reviewing an already reviewed application is rejected (400 Bad Request).
        4. Rejecting an application keeps customer role and does not create SellerProfile.
        """
        # Admin cannot apply as seller
        self.authenticate_jwt(self.admin)
        admin_apply_resp = self.client.post(
            self.application_create_url,
            {
                "business_name": "Admin Venture",
                "business_type": "Retail",
                "business_email": "admin@example.com",
                "business_phone": "9847666666",
                "business_address": "Admin Street",
                "city": "Kochi",
                "state": "Kerala",
                "postal_code": "682001",
                "country": "India",
            },
            format="json",
        )
        self.assertEqual(admin_apply_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Unauthenticated request is rejected (401 Unauthorized)
        self.clear_credentials()
        unauth_resp = self.client.post(
            self.application_create_url,
            {
                "business_name": "Anonymous Store",
                "business_type": "Retail",
                "business_email": "anon@example.com",
                "business_phone": "9847777777",
                "business_address": "No Street",
                "city": "Kochi",
                "state": "Kerala",
                "postal_code": "682001",
                "country": "India",
            },
            format="json",
        )
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer applies, admin rejects application
        applicant = User.objects.create_user(
            email="rejected_applicant@example.com",
            password=self.password,
            role=User.Role.CUSTOMER,
        )
        self.authenticate_jwt(applicant)
        apply_resp = self.client.post(
            self.application_create_url,
            {
                "business_name": "Incomplete Business Details",
                "business_type": "Retail",
                "business_email": "incomplete@example.com",
                "business_phone": "9847888888",
                "business_address": "Test Street",
                "city": "Kollam",
                "state": "Kerala",
                "postal_code": "691001",
                "country": "India",
            },
            format="json",
        )
        self.assertEqual(apply_resp.status_code, status.HTTP_201_CREATED)
        app_id = apply_resp.data["id"]

        # Admin rejects application
        self.authenticate_jwt(self.admin)
        reject_url = f"{self.admin_applications_url}{app_id}/review/"
        reject_resp = self.client.patch(
            reject_url,
            {
                "status": "rejected",
                "review_notes": "Valid tax registration certificate is missing.",
            },
            format="json",
        )
        self.assertEqual(reject_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_resp.data["status"], "rejected")

        # Applicant retains CUSTOMER role and no SellerProfile is created
        applicant.refresh_from_db()
        self.assertEqual(applicant.role, User.Role.CUSTOMER)
        self.assertFalse(SellerProfile.objects.filter(user=applicant).exists())

        # Attempting to re-review an already reviewed application is rejected (400 Bad Request)
        re_review_resp = self.client.patch(
            reject_url,
            {
                "status": "approved",
                "review_notes": "Trying to re-approve already rejected application.",
            },
            format="json",
        )
        self.assertEqual(re_review_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # -------------------------------------------------------------
        # Requirement 2: Already-approved seller application eligibility
        # -------------------------------------------------------------
        # Existing approved seller attempts to submit another seller application
        existing_seller_user = User.objects.create_user(
            email="existing_approved_seller@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        existing_seller_profile = SellerProfile.objects.create(
            user=existing_seller_user,
            business_name="Existing Approved Spices Co",
            business_type="Wholesale",
            business_email="existing@example.com",
            business_phone="9847999888",
            business_address="Merchant Road 10",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        initial_total_applications = SellerApplication.objects.count()

        self.authenticate_jwt(existing_seller_user)
        seller_apply_resp = self.client.post(
            self.application_create_url,
            {
                "business_name": "Second Branch Store",
                "business_type": "Retail",
                "business_email": "second@example.com",
                "business_phone": "9847111333",
                "business_address": "Market Road 22",
                "city": "Calicut",
                "state": "Kerala",
                "postal_code": "673001",
                "country": "India",
            },
            format="json",
        )
        self.assertEqual(seller_apply_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", seller_apply_resp.data)
        self.assertEqual(
            seller_apply_resp.data["non_field_errors"][0],
            "Only customers can apply to become sellers.",
        )

        # Verify no duplicate application was created
        self.assertEqual(SellerApplication.objects.count(), initial_total_applications)
        self.assertFalse(
            SellerApplication.objects.filter(user=existing_seller_user).exists()
        )

        # Verify no unintended profile changes occurred
        existing_seller_user.refresh_from_db()
        self.assertEqual(existing_seller_user.role, User.Role.SELLER)

        existing_seller_profile.refresh_from_db()
        self.assertEqual(existing_seller_profile.status, SellerProfile.Status.ACTIVE)
        self.assertEqual(existing_seller_profile.business_name, "Existing Approved Spices Co")
