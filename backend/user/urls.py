from django.urls import path
from .views import get_user_profile, update_user_profile, change_password

urlpatterns = [
    path("get-profile/", get_user_profile, name="get_profile"),
    path("profile-update/", update_user_profile, name="update_profile"),
    path("password-change/", change_password, name="change_password"),
]