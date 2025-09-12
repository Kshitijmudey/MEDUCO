# TODO: Enhance Appointment Section in Doctor's Dashboard

## Pending Tasks
- [x] Add POST /patients route in backend/routes/doctors.js for doctors to create patients
- [x] Modify POST /appointments in backend/routes/appointments.js to allow doctors to create appointments
- [ ] Test the integration to ensure no other functionality is affected
- [ ] Verify that all requested features work: new appointment creation, patient lookup/creation, export appointments, view/approve/mark done, real-time data loading

## Information Gathered
- Frontend API (api.js) already has createPatient method implemented
- Backend doctors.js currently has only GET routes
- Backend appointments.js POST route currently only allows patients to create appointments
- Patient creation requires both user and patient records in database
- Doctor appointment creation needs to allow specifying patient_id

## Plan
1. **Add POST /patients in doctors.js**: Create a route that allows doctors to create new patients by creating a user account with role='patient' and a default password, then creating the patient profile.
2. **Modify POST /appointments in appointments.js**: Update the route to allow doctors to create appointments for patients by providing patient_id and using the doctor's own id.
3. **Test Integration**: Verify that the frontend can successfully create patients and appointments through the new backend routes.
4. **Verify Features**: Ensure all appointment management features work as expected without breaking existing functionality.
