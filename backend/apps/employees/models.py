from django.db import models
from apps.core.models import TenantModel


class Department(TenantModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    manager = models.ForeignKey(
        "Employee", on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_departments"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="sub_departments"
    )

    class Meta:
        db_table = "departments"
        unique_together = [["company", "name"]]

    def __str__(self):
        return self.name


class Designation(TenantModel):
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="designations")
    level = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "designations"

    def __str__(self):
        return self.name


class Employee(TenantModel):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        INTERN = "intern", "Intern"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        ON_NOTICE = "on_notice", "On Notice"
        TERMINATED = "terminated", "Terminated"

    # Identity
    employee_id = models.CharField(max_length=20)
    user = models.OneToOneField(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="employee_profile"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    personal_email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    date_of_birth = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to="employee/photos/", null=True, blank=True)

    # Professional
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name="employees")
    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, related_name="employees")
    reporting_manager = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="reportees"
    )
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    date_of_joining = models.DateField()
    date_of_leaving = models.DateField(null=True, blank=True)
    probation_end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_active = models.BooleanField(default=True)

    # Government IDs
    pan_number = models.CharField(max_length=10, blank=True)
    aadhar_number = models.CharField(max_length=12, blank=True)
    pf_number = models.CharField(max_length=22, blank=True)
    uan_number = models.CharField(max_length=12, blank=True)
    esi_number = models.CharField(max_length=17, blank=True)

    # Address
    current_address = models.TextField(blank=True)
    permanent_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    class Meta:
        db_table = "employees"
        unique_together = [["company", "employee_id"]]
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class EmployeeBankDetail(TenantModel):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name="bank_detail")
    account_holder_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=20)
    ifsc_code = models.CharField(max_length=11)
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True)
    account_type = models.CharField(max_length=20, default="savings")

    class Meta:
        db_table = "employee_bank_details"


class EmployeeDocument(TenantModel):
    class DocumentType(models.TextChoices):
        OFFER_LETTER = "offer_letter", "Offer Letter"
        APPOINTMENT_LETTER = "appointment_letter", "Appointment Letter"
        ID_PROOF = "id_proof", "ID Proof"
        ADDRESS_PROOF = "address_proof", "Address Proof"
        EDUCATIONAL = "educational", "Educational Certificate"
        EXPERIENCE = "experience", "Experience Letter"
        OTHER = "other", "Other"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="employee/documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_documents"


class EmergencyContact(TenantModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "employee_emergency_contacts"
