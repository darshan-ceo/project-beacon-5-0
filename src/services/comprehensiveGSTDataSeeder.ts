import { supabase } from "@/integrations/supabase/client";
import comprehensiveMockData from "@/data/seedData/gstLitigationMockDataComprehensive.json";

interface SeedResult {
  success: boolean;
  totalRecords: number;
  breakdown: {
    courts: number;
    judges: number;
    clients: number;
    employees: number;
  };
  errors: string[];
  duplicatesFound?: boolean;
  existingData?: {
    courts: number;
    judges: number;
    clients: number;
    employees: number;
  };
}

export class ComprehensiveGSTDataSeeder {
  private tenantId: string | null = null;
  private userId: string | null = null;
  private courtIdMap: Map<string, string> = new Map();

  /**
   * Initialize by authenticating and getting tenant_id
   */
  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated. Please log in first.");
    }

    this.userId = user.id;

    // Get tenant_id from profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      throw new Error("Failed to retrieve user profile. Please ensure your profile is set up.");
    }

    this.tenantId = profile.tenant_id;
  }

  /**
   * Seed courts/legal authorities
   */
  async seedCourts(mockCourts: any[]): Promise<number> {
    if (!this.tenantId) throw new Error("Tenant ID not initialized");

    const courtsToInsert = mockCourts.map((court) => ({
      tenant_id: this.tenantId,
      name: court.name,
      code: court.code,
      type: court.type,
      level: court.level,
      jurisdiction: court.jurisdiction,
      city: court.city,
      state: court.state,
      address: court.address,
      established_year: court.established_year,
      created_by: this.userId,
    }));

    const { data, error } = await supabase
      .from("courts")
      .insert(courtsToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to seed courts: ${error.message}`);
    }

    // Build map of court_code -> court_id for judges seeding
    if (data) {
      data.forEach((court) => {
        this.courtIdMap.set(court.code, court.id);
      });
    }

    return data?.length || 0;
  }

  /**
   * Seed judges
   */
  async seedJudges(mockJudges: any[]): Promise<number> {
    if (!this.tenantId) throw new Error("Tenant ID not initialized");

    const judgesToInsert = mockJudges.map((judge) => ({
      tenant_id: this.tenantId,
      name: judge.name,
      designation: judge.designation,
      email: judge.email,
      phone: judge.phone,
      court_id: this.courtIdMap.get(judge.court_code) || null,
      created_by: this.userId,
    }));

    const { data, error } = await supabase
      .from("judges")
      .insert(judgesToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to seed judges: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Seed clients
   */
  async seedClients(mockClients: any[]): Promise<number> {
    if (!this.tenantId) throw new Error("Tenant ID not initialized");

    const clientsToInsert = mockClients.map((client) => ({
      tenant_id: this.tenantId,
      display_name: client.display_name,
      gstin: client.gstin,
      pan: client.pan,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      state: client.state,
      pincode: client.pincode,
      status: client.status,
      owner_id: this.userId,
    }));

    const { data, error } = await supabase
      .from("clients")
      .insert(clientsToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to seed clients: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Seed employees
   */
  async seedEmployees(mockEmployees: any[]): Promise<number> {
    if (!this.tenantId) throw new Error("Tenant ID not initialized");

    let insertedCount = 0;

    // First employee: insert with current user ID (upsert to handle existing)
    const firstEmployee = {
      id: this.userId as string,
      tenant_id: this.tenantId as string,
      employee_code: mockEmployees[0].employee_code,
      email: mockEmployees[0].email,
      full_name: mockEmployees[0].full_name,
      role: mockEmployees[0].role,
      department: mockEmployees[0].department,
      designation: mockEmployees[0].designation,
      official_email: mockEmployees[0].official_email,
      mobile: mockEmployees[0].mobile,
      gender: mockEmployees[0].gender,
      qualification: mockEmployees[0].qualification,
      bar_council_no: mockEmployees[0].bar_council_no || null,
      icai_no: mockEmployees[0].icai_no || null,
      experience_years: mockEmployees[0].experience_years,
      specialization: mockEmployees[0].specialization,
      areas_of_practice: mockEmployees[0].areas_of_practice,
      billing_rate: mockEmployees[0].billing_rate,
      billable: mockEmployees[0].billable,
      status: mockEmployees[0].status,
      date_of_joining: mockEmployees[0].date_of_joining,
      city: mockEmployees[0].city,
      state: mockEmployees[0].state,
      created_by: this.userId as string,
    };

    const { error: firstError } = await supabase
      .from("employees")
      .upsert([firstEmployee], { onConflict: 'id' });

    if (firstError) {
      console.warn(`Warning: Could not upsert first employee: ${firstError.message}`);
    } else {
      insertedCount = 1;
    }

    // Rest of employees: insert without specifying id (DB will auto-generate)
    if (mockEmployees.length > 1) {
      const restEmployees = mockEmployees.slice(1).map((employee) => ({
        tenant_id: this.tenantId as string,
        employee_code: employee.employee_code,
        email: employee.email,
        full_name: employee.full_name,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        official_email: employee.official_email,
        mobile: employee.mobile,
        gender: employee.gender,
        qualification: employee.qualification,
        bar_council_no: employee.bar_council_no || null,
        icai_no: employee.icai_no || null,
        experience_years: employee.experience_years,
        specialization: employee.specialization,
        areas_of_practice: employee.areas_of_practice,
        billing_rate: employee.billing_rate,
        billable: employee.billable,
        status: employee.status,
        date_of_joining: employee.date_of_joining,
        city: employee.city,
        state: employee.state,
        created_by: this.userId as string,
      })) as any;

      const { data, error } = await supabase
        .from("employees")
        .insert(restEmployees)
        .select();

      if (error) {
        throw new Error(`Failed to seed employees: ${error.message}`);
      }

      insertedCount += data?.length || 0;
    }

    return insertedCount;
  }

  /**
   * Check if master data already exists
   */
  async checkExistingData(): Promise<{
    courts: number;
    judges: number;
    clients: number;
    employees: number;
    hasData: boolean;
  }> {
    if (!this.tenantId) {
      await this.initialize();
    }

    const [courtsCount, judgesCount, clientsCount, employeesCount] = await Promise.all([
      supabase.from("courts").select("id", { count: "exact", head: true }).eq("tenant_id", this.tenantId!),
      supabase.from("judges").select("id", { count: "exact", head: true }).eq("tenant_id", this.tenantId!),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("tenant_id", this.tenantId!),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", this.tenantId!),
    ]);

    const courts = courtsCount.count || 0;
    const judges = judgesCount.count || 0;
    const clients = clientsCount.count || 0;
    const employees = employeesCount.count || 0;

    return {
      courts,
      judges,
      clients,
      employees,
      hasData: courts > 0 || judges > 0 || clients > 0 || employees > 0,
    };
  }

  /**
   * Main seeding orchestration
   */
  async seedAll(skipDuplicateCheck = false): Promise<SeedResult> {
    const result: SeedResult = {
      success: false,
      totalRecords: 0,
      breakdown: {
        courts: 0,
        judges: 0,
        clients: 0,
        employees: 0,
      },
      errors: [],
    };

    try {
      await this.initialize();

      // Check for existing data unless explicitly skipped
      if (!skipDuplicateCheck) {
        const existingData = await this.checkExistingData();
        if (existingData.hasData) {
          result.duplicatesFound = true;
          result.existingData = {
            courts: existingData.courts,
            judges: existingData.judges,
            clients: existingData.clients,
            employees: existingData.employees,
          };
          console.log("⚠️ Existing master data found:", existingData);
          return result;
        }
      }

      console.log("🌱 Starting comprehensive data seeding...");

      // Seed in order: Courts → Judges → Clients → Employees
      result.breakdown.courts = await this.seedCourts(comprehensiveMockData.modules.courts);
      console.log(`✅ Seeded ${result.breakdown.courts} courts`);

      result.breakdown.judges = await this.seedJudges(comprehensiveMockData.modules.judges);
      console.log(`✅ Seeded ${result.breakdown.judges} judges`);

      result.breakdown.clients = await this.seedClients(comprehensiveMockData.modules.clients);
      console.log(`✅ Seeded ${result.breakdown.clients} clients`);

      result.breakdown.employees = await this.seedEmployees(comprehensiveMockData.modules.employees);
      console.log(`✅ Seeded ${result.breakdown.employees} employees`);

      result.totalRecords = 
        result.breakdown.courts +
        result.breakdown.judges +
        result.breakdown.clients +
        result.breakdown.employees;

      result.success = true;
      console.log(`🎉 Successfully seeded ${result.totalRecords} total records`);

    } catch (error: any) {
      result.errors.push(error.message);
      console.error("❌ Seeding failed:", error);
    }

    return result;
  }
}

// Export singleton instance
export const comprehensiveGSTDataSeeder = new ComprehensiveGSTDataSeeder();
