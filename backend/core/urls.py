from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def health(request):
    return HttpResponse("Expense Explorer API is running")

urlpatterns = [
    path("", health, name="health"),
    path('admin/', admin.site.urls),
    path('api/', include('expenses.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
