import { Forum } from '@/contexts/AppStateContext';

export interface CreateForumData {
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

export interface UpdateForumData extends Partial<CreateForumData> {
  id: string;
}

class ForumsService {
  private forums: Forum[] = [];

  async create(data: CreateForumData): Promise<Forum> {
    const newForum: Forum = {
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

    this.forums.push(newForum);
    return newForum;
  }

  async update(data: UpdateForumData): Promise<Forum> {
    const index = this.forums.findIndex(f => f.id === data.id);
    if (index === -1) {
      throw new Error('Forum not found');
    }

    const updatedForum = {
      ...this.forums[index],
      ...data
    };

    this.forums[index] = updatedForum;
    return updatedForum;
  }

  async get(id: string): Promise<Forum | null> {
    return this.forums.find(f => f.id === id) || null;
  }

  async delete(id: string): Promise<void> {
    const index = this.forums.findIndex(f => f.id === id);
    if (index !== -1) {
      this.forums.splice(index, 1);
    }
  }

  async list(): Promise<Forum[]> {
    return [...this.forums];
  }
}

export const forumsService = new ForumsService();
