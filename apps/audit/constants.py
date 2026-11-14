class AuditAction:
    USER_REGISTERED = "USER_REGISTERED"
    PROFILE_UPDATED = "PROFILE_UPDATED"

    SELLER_APPLICATION_SUBMITTED = "SELLER_APPLICATION_SUBMITTED"
    SELLER_APPLICATION_APPROVED = "SELLER_APPLICATION_APPROVED"
    SELLER_APPLICATION_REJECTED = "SELLER_APPLICATION_REJECTED"

    PRODUCT_CREATED = "PRODUCT_CREATED"
    PRODUCT_UPDATED = "PRODUCT_UPDATED"
    PRODUCT_APPROVED = "PRODUCT_APPROVED"
    PRODUCT_REJECTED = "PRODUCT_REJECTED"

    ORDER_CREATED = "ORDER_CREATED"
    ORDER_ITEM_CANCELLED = "ORDER_ITEM_CANCELLED"
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED"

    PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_CANCELLED = "PAYMENT_CANCELLED"


AUDIT_ACTIONS = tuple(
    (value, value)
    for name, value in vars(AuditAction).items()
    if name.isupper() and not name.startswith("_")
)


class AuditEntity:
    USER = "user"
    SELLER_APPLICATION = "seller_application"
    PRODUCT = "product"
    ORDER = "order"
    ORDER_ITEM = "order_item"
    PAYMENT = "payment"


AUDIT_ENTITY_TYPES = tuple(
    (value, value)
    for name, value in vars(AuditEntity).items()
    if name.isupper() and not name.startswith("_")
)
