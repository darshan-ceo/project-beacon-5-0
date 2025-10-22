import { Court } from '@/contexts/AppStateContext';

export interface CreateCourtData {
  name: string;
  type: 'Supreme Court' | 'High Court' | 'District Court' | 'Tribunal' | 'Commission';
  jurisdiction: string;
  address: string;
  digitalFiling: boolean;
  workingDays: string[];
  phone?: string;
  email?: string;
  benchLocation?: string;
}

export interface UpdateCourtData extends Partial<CreateCourtData> {
  id: string;
}

class CourtsService {
  private courts: Court[] = [];

  async create(data: CreateCourtData): Promise<Court> {
    const newCourt: Court = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type,
      jurisdiction: data.jurisdiction,
      address: data.address,
      activeCases: 0,
      avgHearingTime: '0 days',
      digitalFiling: data.digitalFiling,
      workingDays: data.workingDays,
      phone: data.phone,
      email: data.email,
      benchLocation: data.benchLocation
    };

    this.courts.push(newCourt);
    return newCourt;
  }

  async update(data: UpdateCourtData): Promise<Court> {
    const index = this.courts.findIndex(c => c.id === data.id);
    if (index === -1) {
      throw new Error('Court not found');
    }

    const updatedCourt = {
      ...this.courts[index],
      ...data
    };

    this.courts[index] = updatedCourt;
    return updatedCourt;
  }

  async get(id: string): Promise<Court | null> {
    return this.courts.find(c => c.id === id) || null;
  }

  async delete(id: string): Promise<void> {
    const index = this.courts.findIndex(c => c.id === id);
    if (index !== -1) {
      this.courts.splice(index, 1);
    }
  }

  async list(): Promise<Court[]> {
    return [...this.courts];
  }
}

export const courtsService = new CourtsService();