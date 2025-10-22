import { Judge } from '@/contexts/AppStateContext';

export interface JudgeCsvRow {
  name: string;
  designation: string;
  status: string;
  court_id: string;
  bench?: string;
  jurisdiction?: string;
  city?: string;
  state?: string;
  appointment_date: string;
  retirement_date?: string;
  years_of_service?: number;
  specializations: string; // semicolon-separated
  chambers?: string;
  email?: string;
  phone?: string;
  assistant_name?: string;
  assistant_email?: string;
  assistant_phone?: string;
  address_line1?: string;
  address_line2?: string;
  address_locality?: string;
  address_district?: string;
  address_city_id?: string;
  address_state_id?: string;
  address_pincode?: string;
  address_country_id?: string;
  address_map_url?: string;
  availability_days?: string; // comma-separated
  availability_start_time?: string;
  availability_end_time?: string;
  availability_notes?: string;
  tags?: string; // semicolon-separated
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export class JudgesCsvMapper {
  static judgeToRow(judge: Judge): JudgeCsvRow {
    return {
      name: judge.name,
      designation: judge.designation,
      status: judge.status,
      court_id: judge.courtId,
      bench: judge.bench,
      jurisdiction: judge.jurisdiction,
      city: judge.city,
      state: judge.state,
      appointment_date: judge.appointmentDate,
      retirement_date: judge.retirementDate,
      years_of_service: judge.yearsOfService,
      specializations: judge.specialization?.join(';') || '',
      chambers: judge.chambers || judge.contactInfo?.chambers,
      email: judge.email || judge.contactInfo?.email,
      phone: judge.phone || judge.contactInfo?.phone,
      assistant_name: judge.assistant?.name,
      assistant_email: judge.assistant?.email,
      assistant_phone: judge.assistant?.phone,
      address_line1: judge.address?.line1,
      address_line2: judge.address?.line2,
      address_locality: judge.address?.locality,
      address_district: judge.address?.district,
      address_city_id: judge.address?.cityId,
      address_state_id: judge.address?.stateId,
      address_pincode: judge.address?.pincode,
      address_country_id: judge.address?.countryId,
      address_map_url: judge.address?.mapUrl,
      availability_days: judge.availability?.days?.join(','),
      availability_start_time: judge.availability?.startTime,
      availability_end_time: judge.availability?.endTime,
      availability_notes: judge.availability?.notes,
      tags: judge.tags?.join(';'),
      notes: judge.notes,
      created_at: judge.createdAt,
      updated_at: judge.updatedAt,
      created_by: judge.createdBy,
      updated_by: judge.updatedBy
    };
  }

  static rowToJudge(row: JudgeCsvRow, id?: string): Judge {
    const now = new Date().toISOString();
    
    return {
      id: id || Date.now().toString(),
      name: row.name,
      designation: row.designation,
      status: row.status as Judge['status'],
      forumId: row.court_id,
      courtId: row.court_id,
      bench: row.bench,
      jurisdiction: row.jurisdiction,
      city: row.city,
      state: row.state,
      appointmentDate: row.appointment_date,
      retirementDate: row.retirement_date,
      yearsOfService: row.years_of_service || (row.appointment_date ? 
        Math.floor((new Date().getTime() - new Date(row.appointment_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0),
      specialization: row.specializations ? row.specializations.split(';').filter(s => s.trim()) : [],
      chambers: row.chambers,
      email: row.email,
      phone: row.phone,
      assistant: row.assistant_name || row.assistant_email || row.assistant_phone ? {
        name: row.assistant_name,
        email: row.assistant_email,
        phone: row.assistant_phone
      } : undefined,
      address: (row.address_line1 || row.address_locality || row.address_pincode) ? {
        line1: row.address_line1 || '',
        line2: row.address_line2,
        locality: row.address_locality,
        district: row.address_district,
        cityId: row.address_city_id,
        stateId: row.address_state_id,
        pincode: row.address_pincode || '',
        countryId: row.address_country_id || 'IN',
        mapUrl: row.address_map_url,
        source: 'manual' as const
      } : undefined,
      availability: (row.availability_days || row.availability_start_time || row.availability_end_time) ? {
        days: row.availability_days ? row.availability_days.split(',').filter(d => d.trim()) as any : undefined,
        startTime: row.availability_start_time,
        endTime: row.availability_end_time,
        notes: row.availability_notes
      } : undefined,
      tags: row.tags ? row.tags.split(';').filter(t => t.trim()) : undefined,
      notes: row.notes,
      // Legacy fields
      totalCases: 0,
      avgDisposalTime: '0 days',
      contactInfo: {
        chambers: row.chambers || '',
        phone: row.phone,
        email: row.email
      },
      createdAt: row.created_at || now,
      updatedAt: row.updated_at || now,
      createdBy: row.created_by || 'import',
      updatedBy: row.updated_by || 'import'
    };
  }

  static validateRow(row: JudgeCsvRow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!row.name?.trim()) {
      errors.push('Name is required');
    }
    if (!row.designation?.trim()) {
      errors.push('Designation is required');
    }
    if (!row.court_id?.trim()) {
      errors.push('Court ID is required');
    }
    if (!row.appointment_date) {
      errors.push('Appointment date is required');
    }

    // Status validation
    const validStatuses = ['Active', 'On Leave', 'Retired', 'Transferred', 'Deceased'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Date validation
    if (row.appointment_date && isNaN(new Date(row.appointment_date).getTime())) {
      errors.push('Invalid appointment date format');
    }
    if (row.retirement_date && isNaN(new Date(row.retirement_date).getTime())) {
      errors.push('Invalid retirement date format');
    }
    if (row.appointment_date && row.retirement_date && 
        new Date(row.appointment_date) >= new Date(row.retirement_date)) {
      errors.push('Retirement date must be after appointment date');
    }

    // Email validation
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Invalid email format');
    }
    if (row.assistant_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.assistant_email)) {
      errors.push('Invalid assistant email format');
    }

    // Phone validation (basic)
    if (row.phone && row.phone.length < 10) {
      errors.push('Phone number should be at least 10 digits');
    }

    // Pincode validation
    if (row.address_pincode && !/^\d{6}$/.test(row.address_pincode)) {
      errors.push('Pincode should be 6 digits');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getCsvHeaders(): string[] {
    return [
      'name',
      'designation',
      'status',
      'court_id',
      'bench',
      'jurisdiction',
      'city',
      'state',
      'appointment_date',
      'retirement_date',
      'years_of_service',
      'specializations',
      'chambers',
      'email',
      'phone',
      'assistant_name',
      'assistant_email',
      'assistant_phone',
      'address_line1',
      'address_line2',
      'address_locality',
      'address_district',
      'address_city_id',
      'address_state_id',
      'address_pincode',
      'address_country_id',
      'address_map_url',
      'availability_days',
      'availability_start_time',
      'availability_end_time',
      'availability_notes',
      'tags',
      'notes',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by'
    ];
  }

  static generateSampleCsv(): string {
    const headers = this.getCsvHeaders();
    const sampleRows = [
      {
        name: 'Justice Rajesh Kumar',
        designation: 'Justice',
        status: 'Active',
        court_id: 'court-1',
        bench: 'Bench A',
        jurisdiction: 'Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        appointment_date: '2015-04-15',
        retirement_date: '2030-04-14',
        years_of_service: '9',
        specializations: 'GST/Indirect Tax;Constitutional/Writs',
        chambers: 'Chamber 101',
        email: 'justice.kumar@delhi.gov.in',
        phone: '+91 98765 43210',
        assistant_name: 'Mr. Sharma',
        assistant_email: 'sharma@delhi.gov.in',
        assistant_phone: '+91 98765 43211',
        address_line1: '123 Court Complex',
        address_line2: 'Sector 15',
        address_locality: 'Central Delhi',
        address_district: 'New Delhi',
        address_city_id: 'delhi',
        address_state_id: 'DL',
        address_pincode: '110001',
        address_country_id: 'IN',
        address_map_url: '',
        availability_days: 'Mon,Tue,Wed,Thu,Fri',
        availability_start_time: '09:00',
        availability_end_time: '17:00',
        availability_notes: 'Available for hearings 9 AM to 5 PM',
        tags: 'Senior;Expert',
        notes: 'Experienced in GST matters',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        updated_by: 'admin'
      }
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => 
        headers.map(header => {
          const value = (row as any)[header] || '';
          // Escape values that contain commas, quotes, or newlines
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

export const judgesCsvMapper = new JudgesCsvMapper();