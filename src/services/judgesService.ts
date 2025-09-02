import { Judge } from '@/contexts/AppStateContext';

export interface CreateJudgeData {
  name: string;
  designation: string;
  courtId: string;
  benchId?: string;
  appointmentDate: string;
  retirementDate?: string;
  specialization: string[];
  contactInfo: {
    chambers: string;
    phone?: string;
    email?: string;
  };
  status: 'Active' | 'On Leave' | 'Retired';
}

export interface UpdateJudgeData extends Partial<CreateJudgeData> {
  id: string;
}

class JudgesService {
  private judges: Judge[] = [];

  async create(data: CreateJudgeData): Promise<Judge> {
    const existingJudge = this.judges.find(j => 
      j.name === data.name && j.courtId === data.courtId
    );
    
    if (existingJudge) {
      throw new Error('Judge with this name already exists in this court');
    }

    const newJudge: Judge = {
      id: Date.now().toString(),
      name: data.name,
      designation: data.designation,
      courtId: data.courtId,
      appointmentDate: data.appointmentDate,
      retirementDate: data.retirementDate || '',
      specialization: data.specialization,
      contactInfo: data.contactInfo,
      status: data.status,
      totalCases: 0,
      avgDisposalTime: '0 days'
    };

    this.judges.push(newJudge);
    return newJudge;
  }

  async update(data: UpdateJudgeData): Promise<Judge> {
    const index = this.judges.findIndex(j => j.id === data.id);
    if (index === -1) {
      throw new Error('Judge not found');
    }

    const updatedJudge = {
      ...this.judges[index],
      ...data
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