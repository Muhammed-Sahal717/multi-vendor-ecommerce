from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsPlatformAdmin
from apps.common.services import get_admin_dashboard_stats


class AdminDashboardView(APIView):
    permission_classes = [IsPlatformAdmin]
    http_method_names = ["get", "head", "options"]

    def get(self, request):
        stats = get_admin_dashboard_stats()
        return Response(stats, status=status.HTTP_200_OK)
