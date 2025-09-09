export interface Specialization {
  id: string;
  name: string;
  category: 'Tax' | 'Civil' | 'Criminal' | 'Commercial' | 'Constitutional' | 'Other';
  description?: string;
  enabled: boolean;
  priority: number; // Higher priority shows first
  createdAt: string;
  updatedAt: string;
}

class SpecializationsService {
  private specializations: Specialization[] = [
    {
      id: 'gst-indirect-tax',
      name: 'GST/Indirect Tax',
      category: 'Tax',
      description: 'Goods and Services Tax and other indirect taxation matters',
      enabled: true,
      priority: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'customs',
      name: 'Customs',
      category: 'Tax',
      description: 'Customs duty and related trade matters',
      enabled: true,
      priority: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'excise',
      name: 'Excise',
      category: 'Tax',
      description: 'Central Excise and related matters',
      enabled: true,
      priority: 85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'constitutional-writs',
      name: 'Constitutional/Writs',
      category: 'Constitutional',
      description: 'Constitutional matters and writ petitions',
      enabled: true,
      priority: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'corporate-commercial',
      name: 'Corporate/Commercial',
      category: 'Commercial',
      description: 'Corporate law and commercial disputes',
      enabled: true,
      priority: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'civil',
      name: 'Civil',
      category: 'Civil',
      description: 'Civil law matters and disputes',
      enabled: true,
      priority: 70,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'criminal',
      name: 'Criminal',
      category: 'Criminal',
      description: 'Criminal law and related matters',
      enabled: true,
      priority: 65,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'labour',
      name: 'Labour',
      category: 'Other',
      description: 'Labour law and employment disputes',
      enabled: true,
      priority: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'environmental',
      name: 'Environmental',
      category: 'Other',
      description: 'Environmental law and regulations',
      enabled: true,
      priority: 55,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'family',
      name: 'Family',
      category: 'Civil',
      description: 'Family law and matrimonial disputes',
      enabled: true,
      priority: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'property',
      name: 'Property',
      category: 'Civil',
      description: 'Property law and real estate disputes',
      enabled: true,
      priority: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  async getAll(): Promise<Specialization[]> {
    return [...this.specializations].sort((a, b) => b.priority - a.priority);
  }

  async getEnabledSpecializations(): Promise<string[]> {
    return this.specializations
      .filter(s => s.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map(s => s.name);
  }

  async getByCategory(category: Specialization['category']): Promise<Specialization[]> {
    return this.specializations
      .filter(s => s.category === category && s.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  async create(data: Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Specialization> {
    const newSpecialization: Specialization = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.specializations.push(newSpecialization);
    return newSpecialization;
  }

  async update(id: string, data: Partial<Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Specialization | null> {
    const index = this.specializations.findIndex(s => s.id === id);
    if (index === -1) return null;

    const updatedSpecialization = {
      ...this.specializations[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.specializations[index] = updatedSpecialization;
    return updatedSpecialization;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.specializations.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.specializations.splice(index, 1);
    return true;
  }

  async toggleEnabled(id: string): Promise<Specialization | null> {
    const specialization = this.specializations.find(s => s.id === id);
    if (!specialization) return null;

    return this.update(id, { enabled: !specialization.enabled });
  }
}

export const specializationsService = new SpecializationsService();