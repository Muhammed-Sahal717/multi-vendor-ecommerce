from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import SellerApplication
from .serializers import SellerApplicationSerializer


class SellerApplicationCreateView(generics.CreateAPIView):
    serializer_class = SellerApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SellerApplication.objects.filter(user=self.request.user)
