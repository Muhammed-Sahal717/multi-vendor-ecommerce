import django_filters

from .models import Category, Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(
        method="filter_category",
    )

    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
    )

    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
    )

    class Meta:
        model = Product
        fields = ["category", "min_price", "max_price"]

    def filter_category(self, queryset, name, value):
        if not value:
            return queryset

        val = str(value).strip()
        target = Category.objects.filter(slug=val).first()
        if not target:
            target = Category.objects.filter(name__iexact=val).first()
        if not target:
            try:
                target = Category.objects.filter(id=val).first()
            except Exception:
                target = None

        if not target:
            return queryset.filter(category__slug=val)

        category_ids = {target.id}
        frontier = [target.id]
        while frontier:
            children_ids = list(
                Category.objects.filter(parent_id__in=frontier, is_active=True).values_list("id", flat=True)
            )
            if not children_ids:
                break
            new_ids = set(children_ids) - category_ids
            if not new_ids:
                break
            category_ids.update(new_ids)
            frontier = list(new_ids)

        return queryset.filter(category_id__in=category_ids)
