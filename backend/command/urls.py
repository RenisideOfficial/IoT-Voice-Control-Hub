from django.urls import path
from .views import control_device, get_device_state

urlpatterns = [
    path("<str:device_name>/control/", control_device, name="control_device"),
    path("<str:device_name>/state/", get_device_state, name="get_device_state"),
]