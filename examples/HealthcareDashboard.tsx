import React, { useState, useEffect } from 'react';

/**
 * Patient status types
 */
export type PatientStatus = 'admitted' | 'discharged' | 'critical' | 'stable' | 'scheduled';

/**
 * Department types within the hospital
 */
export type Department = 'cardiology' | 'neurology' | 'orthopedics' | 'pediatrics' | 'oncology' | 'emergency';

/**
 * Patient medical record
 */
export interface MedicalRecord {
    /**
     * Record ID
     */
    id: string;
    /**
     * Record type (lab test, visit, procedure, etc)
     */
    type: 'lab' | 'visit' | 'procedure' | 'medication' | 'allergy' | 'note';
    /**
     * Date of the medical record
     */
    date: string;
    /**
     * Description of the record
     */
    description: string;
    /**
     * Healthcare provider associated with this record
     */
    provider: string;
    /**
     * Results or notes (for lab tests or procedures)
     */
    results?: string;
    /**
     * Relevant measurements or values
     */
    values?: {
        name: string;
        value: number | string;
        unit?: string;
        normalRange?: {
            min: number;
            max: number;
        };
    }[];
}

/**
 * Patient information
 */
export interface Patient {
    /**
     * Unique patient ID
     */
    id: string;
    /**
     * Patient's full name
     */
    name: string;
    /**
     * Patient's age
     */
    age: number;
    /**
     * Patient's gender
     */
    gender: 'male' | 'female' | 'other';
    /**
     * Patient's current status
     */
    status: PatientStatus;
    /**
     * Department the patient is assigned to
     */
    department: Department;
    /**
     * Room number (if admitted)
     */
    roomNumber?: string;
    /**
     * Doctor assigned to the patient
     */
    assignedDoctor: string;
    /**
     * Date of admission
     */
    admissionDate: string;
    /**
     * Expected discharge date
     */
    expectedDischargeDate?: string;
    /**
     * Patient's diagnosis
     */
    diagnosis: string;
    /**
     * Medical records for this patient
     */
    medicalRecords: MedicalRecord[];
    /**
     * Insurance information
     */
    insurance: {
        provider: string;
        policyNumber: string;
        coveragePercentage: number;
    };
    /**
     * Emergency contact
     */
    emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
    };
    /**
     * Additional notes about the patient
     */
    notes?: string;
}

/**
 * Props for the Healthcare Dashboard component
 */
interface HealthcareDashboardProps {
    /**
     * Initial patients data
     */
    initialPatients?: Patient[];
    /**
     * Whether the dashboard is in admin mode
     */
    adminMode?: boolean;
    /**
     * Current user name (doctor or administrator)
     */
    currentUser?: string;
    /**
     * Department filter (if provided, only show patients from this department)
     */
    departmentFilter?: Department;
    /**
     * Callback when a patient is selected
     */
    onPatientSelect?: (patient: Patient) => void;
}

/**
 * Mock data for generating realistic test patients
 */
const MOCK_NAMES = [
    'John Smith', 'Emma Johnson', 'Michael Williams', 'Olivia Brown',
    'James Davis', 'Sophia Miller', 'Robert Wilson', 'Isabella Moore',
    'David Taylor', 'Mia Anderson', 'Joseph Thomas', 'Charlotte Jackson',
    'Daniel White', 'Ava Harris', 'Matthew Martin', 'Amelia Thompson'
];

const MOCK_DOCTORS = [
    'Dr. Rodriguez', 'Dr. Garcia', 'Dr. Smith', 'Dr. Chen',
    'Dr. Patel', 'Dr. Kim', 'Dr. Johnson', 'Dr. Williams'
];

const MOCK_DIAGNOSES = [
    'Hypertension', 'Type 2 Diabetes', 'Acute Myocardial Infarction',
    'Pneumonia', 'Fractured Femur', 'Appendicitis', 'Migraine',
    'Stroke', 'Influenza', 'COPD', 'Kidney Stones', 'Gastritis'
];

const MOCK_INSURANCE_PROVIDERS = [
    'Blue Cross', 'Aetna', 'Cigna', 'UnitedHealthcare',
    'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid'
];

/**
 * Generate a random patient for testing
 */
const generateMockPatient = (id: string): Patient => {
    const status = ['admitted', 'discharged', 'critical', 'stable', 'scheduled'][Math.floor(Math.random() * 5)] as PatientStatus;
    const department = ['cardiology', 'neurology', 'orthopedics', 'pediatrics', 'oncology', 'emergency'][Math.floor(Math.random() * 6)] as Department;
    const admissionDate = new Date();
    admissionDate.setDate(admissionDate.getDate() - Math.floor(Math.random() * 10));

    const dischargeDate = new Date(admissionDate);
    dischargeDate.setDate(dischargeDate.getDate() + Math.floor(Math.random() * 14) + 1);

    return {
        id,
        name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
        age: Math.floor(Math.random() * 70) + 18,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        status,
        department,
        roomNumber: status === 'discharged' ? undefined : `${Math.floor(Math.random() * 5) + 1}${Math.floor(Math.random() * 100) + 1}`,
        assignedDoctor: MOCK_DOCTORS[Math.floor(Math.random() * MOCK_DOCTORS.length)],
        admissionDate: admissionDate.toISOString().split('T')[0],
        expectedDischargeDate: status !== 'discharged' ? dischargeDate.toISOString().split('T')[0] : undefined,
        diagnosis: MOCK_DIAGNOSES[Math.floor(Math.random() * MOCK_DIAGNOSES.length)],
        medicalRecords: generateMockMedicalRecords(),
        insurance: {
            provider: MOCK_INSURANCE_PROVIDERS[Math.floor(Math.random() * MOCK_INSURANCE_PROVIDERS.length)],
            policyNumber: `POL-${Math.floor(Math.random() * 1000000)}`,
            coveragePercentage: Math.floor(Math.random() * 40) + 60
        },
        emergencyContact: {
            name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
            relationship: ['Spouse', 'Parent', 'Child', 'Sibling'][Math.floor(Math.random() * 4)],
            phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
        }
    };
};

/**
 * Generate mock medical records for a patient
 */
const generateMockMedicalRecords = (): MedicalRecord[] => {
    const recordCount = Math.floor(Math.random() * 5) + 1;
    const records: MedicalRecord[] = [];

    for (let i = 0; i < recordCount; i++) {
        const recordDate = new Date();
        recordDate.setDate(recordDate.getDate() - Math.floor(Math.random() * 30));

        const recordType = ['lab', 'visit', 'procedure', 'medication', 'allergy', 'note'][Math.floor(Math.random() * 6)] as MedicalRecord['type'];

        const record: MedicalRecord = {
            id: `REC-${Math.floor(Math.random() * 1000000)}`,
            type: recordType,
            date: recordDate.toISOString().split('T')[0],
            description: getRandomDescription(recordType),
            provider: MOCK_DOCTORS[Math.floor(Math.random() * MOCK_DOCTORS.length)],
        };

        // Add type-specific data
        if (recordType === 'lab') {
            record.values = [
                {
                    name: 'Glucose',
                    value: Math.floor(Math.random() * 150) + 70,
                    unit: 'mg/dL',
                    normalRange: { min: 70, max: 100 }
                },
                {
                    name: 'Cholesterol',
                    value: Math.floor(Math.random() * 150) + 120,
                    unit: 'mg/dL',
                    normalRange: { min: 125, max: 200 }
                }
            ];
        } else if (recordType === 'procedure') {
            record.results = ['Successful', 'Completed with complications', 'Rescheduled', 'Completed'][Math.floor(Math.random() * 4)];
        }

        records.push(record);
    }

    return records;
};

/**
 * Get a random description based on record type
 */
const getRandomDescription = (type: MedicalRecord['type']): string => {
    const descriptions: Record<MedicalRecord['type'], string[]> = {
        lab: ['Complete Blood Count', 'Metabolic Panel', 'Lipid Panel', 'Thyroid Function', 'Urinalysis'],
        visit: ['Annual Checkup', 'Follow-up Appointment', 'Emergency Visit', 'Specialist Consultation'],
        procedure: ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Surgery', 'Biopsy'],
        medication: ['Prescription Update', 'Medication Review', 'New Prescription'],
        allergy: ['Allergy Test', 'New Allergy Documented', 'Allergy Review'],
        note: ['Progress Note', 'Doctor\'s Note', 'Nursing Note', 'Therapy Note']
    };

    return descriptions[type][Math.floor(Math.random() * descriptions[type].length)];
};

/**
 * Healthcare Dashboard component that displays and manages patient information
 */
const HealthcareDashboard: React.FC<HealthcareDashboardProps> = ({
    initialPatients = [],
    adminMode = false,
    currentUser = 'Dr. Smith',
    departmentFilter,
    onPatientSelect
}) => {
    // State for patients
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('all');
    const [departmentView, setDepartmentView] = useState<Department | 'all'>(departmentFilter || 'all');
    const [isAddingPatient, setIsAddingPatient] = useState(false);

    // Generate mock patients if none are provided
    useEffect(() => {
        if (initialPatients.length === 0) {
            const mockPatients: Patient[] = [];
            for (let i = 0; i < 20; i++) {
                mockPatients.push(generateMockPatient(`P-${1000 + i}`));
            }
            setPatients(mockPatients);
        }
    }, [initialPatients]);

    // Filter patients based on search, status, and department
    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
        const matchesDepartment = departmentView === 'all' || patient.department === departmentView;

        return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Calculate statistics
    const stats = {
        totalPatients: patients.length,
        admitted: patients.filter(p => p.status === 'admitted').length,
        critical: patients.filter(p => p.status === 'critical').length,
        discharged: patients.filter(p => p.status === 'discharged').length,
        byDepartment: {
            cardiology: patients.filter(p => p.department === 'cardiology').length,
            neurology: patients.filter(p => p.department === 'neurology').length,
            orthopedics: patients.filter(p => p.department === 'orthopedics').length,
            pediatrics: patients.filter(p => p.department === 'pediatrics').length,
            oncology: patients.filter(p => p.department === 'oncology').length,
            emergency: patients.filter(p => p.department === 'emergency').length
        }
    };

    /**
     * Handle patient selection
     */
    const handlePatientSelect = (patient: Patient) => {
        setSelectedPatient(patient);
        if (onPatientSelect) {
            onPatientSelect(patient);
        }
    };

    /**
     * Handle patient status update
     */
    const handleStatusUpdate = (patientId: string, newStatus: PatientStatus) => {
        setPatients(patients.map(p =>
            p.id === patientId ? { ...p, status: newStatus } : p
        ));
    };

    /**
     * Add a new medical record to a patient
     */
    const handleAddMedicalRecord = (patientId: string, record: MedicalRecord) => {
        setPatients(patients.map(p =>
            p.id === patientId ? {
                ...p,
                medicalRecords: [...p.medicalRecords, record]
            } : p
        ));
    };

    return (
        <div className="healthcare-dashboard">
            <header className="dashboard-header">
                <h1>Hospital Patient Management System</h1>
                <div className="user-info">
                    <span>Welcome, {currentUser}</span>
                    {adminMode && <span className="admin-badge">Administrator</span>}
                </div>
            </header>

            <div className="dashboard-content">
                <aside className="dashboard-sidebar">
                    <div className="stats-panel">
                        <h2>Statistics</h2>
                        <div className="stat-item">
                            <span className="stat-label">Total Patients</span>
                            <span className="stat-value">{stats.totalPatients}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Admitted</span>
                            <span className="stat-value">{stats.admitted}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Critical</span>
                            <span className="stat-value stat-critical">{stats.critical}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Discharged</span>
                            <span className="stat-value">{stats.discharged}</span>
                        </div>
                    </div>

                    <div className="department-panel">
                        <h2>Departments</h2>
                        <ul className="department-list">
                            <li
                                className={departmentView === 'all' ? 'active' : ''}
                                onClick={() => setDepartmentView('all')}
                            >
                                All Departments
                            </li>
                            <li
                                className={departmentView === 'cardiology' ? 'active' : ''}
                                onClick={() => setDepartmentView('cardiology')}
                            >
                                Cardiology ({stats.byDepartment.cardiology})
                            </li>
                            <li
                                className={departmentView === 'neurology' ? 'active' : ''}
                                onClick={() => setDepartmentView('neurology')}
                            >
                                Neurology ({stats.byDepartment.neurology})
                            </li>
                            <li
                                className={departmentView === 'orthopedics' ? 'active' : ''}
                                onClick={() => setDepartmentView('orthopedics')}
                            >
                                Orthopedics ({stats.byDepartment.orthopedics})
                            </li>
                            <li
                                className={departmentView === 'pediatrics' ? 'active' : ''}
                                onClick={() => setDepartmentView('pediatrics')}
                            >
                                Pediatrics ({stats.byDepartment.pediatrics})
                            </li>
                            <li
                                className={departmentView === 'oncology' ? 'active' : ''}
                                onClick={() => setDepartmentView('oncology')}
                            >
                                Oncology ({stats.byDepartment.oncology})
                            </li>
                            <li
                                className={departmentView === 'emergency' ? 'active' : ''}
                                onClick={() => setDepartmentView('emergency')}
                            >
                                Emergency ({stats.byDepartment.emergency})
                            </li>
                        </ul>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <div className="patient-controls">
                        <div className="search-filter-bar">
                            <input
                                type="text"
                                placeholder="Search patients by name, ID, or diagnosis..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="patient-search"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as PatientStatus | 'all')}
                                className="status-filter"
                            >
                                <option value="all">All Statuses</option>
                                <option value="admitted">Admitted</option>
                                <option value="discharged">Discharged</option>
                                <option value="critical">Critical</option>
                                <option value="stable">Stable</option>
                                <option value="scheduled">Scheduled</option>
                            </select>
                        </div>

                        {adminMode && (
                            <button
                                className="add-patient-button"
                                onClick={() => setIsAddingPatient(true)}
                            >
                                Add New Patient
                            </button>
                        )}
                    </div>

                    <div className="patient-list-container">
                        <h2>Patient List {departmentView !== 'all' ? `(${departmentView})` : ''}</h2>

                        {filteredPatients.length === 0 ? (
                            <div className="no-patients-message">
                                No patients match your search criteria.
                            </div>
                        ) : (
                            <table className="patient-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                        <th>Status</th>
                                        <th>Department</th>
                                        <th>Room</th>
                                        <th>Doctor</th>
                                        <th>Admission Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPatients.map(patient => (
                                        <tr key={patient.id} className={`status-${patient.status}`}>
                                            <td>{patient.id}</td>
                                            <td>{patient.name}</td>
                                            <td>{patient.age}</td>
                                            <td>{patient.gender}</td>
                                            <td>
                                                <span className={`status-badge ${patient.status}`}>
                                                    {patient.status}
                                                </span>
                                            </td>
                                            <td>{patient.department}</td>
                                            <td>{patient.roomNumber || 'N/A'}</td>
                                            <td>{patient.assignedDoctor}</td>
                                            <td>{patient.admissionDate}</td>
                                            <td>
                                                <button
                                                    className="view-patient-button"
                                                    onClick={() => handlePatientSelect(patient)}
                                                >
                                                    View
                                                </button>
                                                {adminMode && (
                                                    <select
                                                        value={patient.status}
                                                        onChange={(e) => handleStatusUpdate(patient.id, e.target.value as PatientStatus)}
                                                        className="update-status-select"
                                                    >
                                                        <option value="admitted">Admitted</option>
                                                        <option value="discharged">Discharged</option>
                                                        <option value="critical">Critical</option>
                                                        <option value="stable">Stable</option>
                                                        <option value="scheduled">Scheduled</option>
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {selectedPatient && (
                        <div className="patient-detail-view">
                            <div className="detail-header">
                                <h2>Patient Details</h2>
                                <button
                                    className="close-details-button"
                                    onClick={() => setSelectedPatient(null)}
                                >
                                    Close
                                </button>
                            </div>

                            <div className="patient-profile">
                                <h3>{selectedPatient.name} ({selectedPatient.id})</h3>

                                <div className="profile-section">
                                    <div className="profile-row">
                                        <div className="profile-field">
                                            <label>Age</label>
                                            <span>{selectedPatient.age}</span>
                                        </div>
                                        <div className="profile-field">
                                            <label>Gender</label>
                                            <span>{selectedPatient.gender}</span>
                                        </div>
                                        <div className="profile-field">
                                            <label>Status</label>
                                            <span className={`status-badge ${selectedPatient.status}`}>
                                                {selectedPatient.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="profile-row">
                                        <div className="profile-field">
                                            <label>Department</label>
                                            <span>{selectedPatient.department}</span>
                                        </div>
                                        <div className="profile-field">
                                            <label>Room</label>
                                            <span>{selectedPatient.roomNumber || 'N/A'}</span>
                                        </div>
                                        <div className="profile-field">
                                            <label>Doctor</label>
                                            <span>{selectedPatient.assignedDoctor}</span>
                                        </div>
                                    </div>

                                    <div className="profile-row">
                                        <div className="profile-field">
                                            <label>Admission Date</label>
                                            <span>{selectedPatient.admissionDate}</span>
                                        </div>
                                        <div className="profile-field">
                                            <label>Expected Discharge</label>
                                            <span>{selectedPatient.expectedDischargeDate || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="profile-row full-width">
                                        <div className="profile-field">
                                            <label>Diagnosis</label>
                                            <span>{selectedPatient.diagnosis}</span>
                                        </div>
                                    </div>

                                    <div className="profile-row full-width">
                                        <div className="profile-field">
                                            <label>Insurance</label>
                                            <span>
                                                {selectedPatient.insurance.provider} (Policy: {selectedPatient.insurance.policyNumber})
                                                - {selectedPatient.insurance.coveragePercentage}% coverage
                                            </span>
                                        </div>
                                    </div>

                                    <div className="profile-row full-width">
                                        <div className="profile-field">
                                            <label>Emergency Contact</label>
                                            <span>
                                                {selectedPatient.emergencyContact.name} ({selectedPatient.emergencyContact.relationship})
                                                - {selectedPatient.emergencyContact.phone}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="medical-records-section">
                                    <h3>Medical Records</h3>

                                    {selectedPatient.medicalRecords.length === 0 ? (
                                        <p>No medical records available.</p>
                                    ) : (
                                        <table className="records-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Type</th>
                                                    <th>Description</th>
                                                    <th>Provider</th>
                                                    <th>Results/Values</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPatient.medicalRecords.map(record => (
                                                    <tr key={record.id}>
                                                        <td>{record.date}</td>
                                                        <td>{record.type}</td>
                                                        <td>{record.description}</td>
                                                        <td>{record.provider}</td>
                                                        <td>
                                                            {record.results && <div>{record.results}</div>}
                                                            {record.values && record.values.map((value, idx) => (
                                                                <div key={idx} className="record-value">
                                                                    {value.name}: {value.value} {value.unit}
                                                                    {value.normalRange && (
                                                                        <span className={
                                                                            typeof value.value === 'number'
                                                                                ? (value.value < value.normalRange.min || value.value > value.normalRange.max
                                                                                    ? 'abnormal-value'
                                                                                    : 'normal-value')
                                                                                : ''
                                                                        }>
                                                                            {typeof value.value === 'number'
                                                                                ? (value.value < value.normalRange.min || value.value > value.normalRange.max
                                                                                    ? ' (Abnormal)'
                                                                                    : ' (Normal)')
                                                                                : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {adminMode && (
                                        <button
                                            className="add-record-button"
                                            onClick={() => {
                                                // In a real app, this would open a form
                                                const newRecord: MedicalRecord = {
                                                    id: `REC-${Math.floor(Math.random() * 1000000)}`,
                                                    type: 'note',
                                                    date: new Date().toISOString().split('T')[0],
                                                    description: 'Progress Note',
                                                    provider: currentUser,
                                                    results: 'Patient consultation completed'
                                                };
                                                handleAddMedicalRecord(selectedPatient.id, newRecord);
                                            }}
                                        >
                                            Add Medical Record
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HealthcareDashboard;
