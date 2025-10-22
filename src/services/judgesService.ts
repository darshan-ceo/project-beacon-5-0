import { Judge } from '@/contexts/AppStateContext';

export interface CreateJudgeData {
  name: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Retired' | 'Transferred' | 'Deceased';
  courtId: string;
  bench?: string;
  jurisdiction?: string;
  city?: string;
  state?: string;
  appointmentDate: string;
  retirementDate?: string;
  specializations?: string[];
  chambers?: string;
  email?: string;
  phone?: string;
  assistant?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address?: any;
  availability?: {
    days?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
    startTime?: string;
    endTime?: string;
    notes?: string;
  };
  tags?: string[];
  notes?: string;
  // Legacy support
  contactInfo?: {
    chambers: string;
    phone?: string;
    email?: string;
  };
  specialization?: string[];
}

export interface UpdateJudgeData extends Partial<CreateJudgeData> {
  id: string;
}

class JudgesService {
  private judges: Judge[] = [];

  async create(data: CreateJudgeData): Promise<Judge> {
    const existingJudge = this.judges.find(j => 
      j.name === data.name && j.forumId === data.courtId && j.designation === data.designation
    );
    
    if (existingJudge) {
      throw new Error('Judge with this name and designation already exists in this court');
    }

    const now = new Date().toISOString();
    const yearsOfService = data.appointmentDate ? 
      Math.floor((new Date().getTime() - new Date(data.appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

    const newJudge: Judge = {
      id: Date.now().toString(),
      name: data.name,
      designation: data.designation,
      status: data.status,
      forumId: data.courtId,
      courtId: data.courtId, // BACKWARD COMPATIBILITY: Keep in sync
      bench: data.bench,
      jurisdiction: data.jurisdiction,
      city: data.city,
      state: data.state,
      appointmentDate: data.appointmentDate,
      retirementDate: data.retirementDate,
      yearsOfService,
      specialization: data.specializations || data.specialization || [],
      chambers: data.chambers,
      email: data.email,
      phone: data.phone,
      assistant: data.assistant,
      address: data.address,
      availability: data.availability,
      tags: data.tags,
      notes: data.notes,
      // Legacy support
      totalCases: 0,
      avgDisposalTime: '0 days',
      contactInfo: data.contactInfo || {
        chambers: data.chambers || '',
        phone: data.phone,
        email: data.email
      },
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system'
    };

    this.judges.push(newJudge);
    return newJudge;
  }

  async update(data: UpdateJudgeData): Promise<Judge> {
    const index = this.judges.findIndex(j => j.id === data.id);
    if (index === -1) {
      throw new Error('Judge not found');
    }

    // Check for duplicate name/court/designation (excluding current judge)
    if ((data.name || data.courtId || data.designation)) {
      const nameToCheck = data.name || this.judges[index].name;
      const courtToCheck = data.courtId || this.judges[index].forumId;
      const designationToCheck = data.designation || this.judges[index].designation;
      
      const existingJudge = this.judges.find(j => 
        j.id !== data.id && 
        j.name === nameToCheck && 
        j.forumId === courtToCheck && 
        j.designation === designationToCheck
      );
      
      if (existingJudge) {
        throw new Error('Judge with this name and designation already exists in this court');
      }
    }

    // Recalculate years of service if appointment date changes
    let yearsOfService = this.judges[index].yearsOfService;
    if (data.appointmentDate) {
      yearsOfService = Math.floor((new Date().getTime() - new Date(data.appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const updatedJudge = {
      ...this.judges[index],
      ...data,
      yearsOfService,
      // Keep courtId in sync with forumId
      ...(data.courtId ? { forumId: data.courtId, courtId: data.courtId } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
      // Update legacy contactInfo if individual fields change
      ...(data.chambers || data.phone || data.email ? {
        contactInfo: {
          ...this.judges[index].contactInfo,
          chambers: data.chambers || this.judges[index].chambers || this.judges[index].contactInfo?.chambers || '',
          phone: data.phone || this.judges[index].contactInfo?.phone,
          email: data.email || this.judges[index].contactInfo?.email
        }
      } : {})
    };

    this.judges[index] = updatedJudge;
    return updatedJudge;
  }

  async get(id: string): Promise<Judge | null> {
    return this.judges.find(j => j.id === id) || null;
  }

  async delete(id: string): Promise<void> {
    const index = this.judges.findIndex(j => j.id === id);
    if (index !== -1) {
      this.judges.splice(index, 1);
    }
  }

  async list(): Promise<Judge[]> {
    return [...this.judges];
  }
}

export const judgesService = new JudgesService();