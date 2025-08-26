from django.urls import path, include
from .views import (
    register_user,
    login_user,
    logout_user,
    GoogleOAuth2CompleteView,
    # mobile_google_login
)

urlpatterns = [
    path("register/", register_user, name="register"),
    path("login/", login_user, name="login"),
    path("logout/", logout_user, name="logout"),
    path("google/callback/", GoogleOAuth2CompleteView.as_view(), name="google_oauth_callback"),
    # path("mobile-login/", mobile_google_login, name="mobile_google_login"),
    # path("", include("social_django.urls", namespace="social")),
]
