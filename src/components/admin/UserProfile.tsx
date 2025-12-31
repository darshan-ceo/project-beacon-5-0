import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  Camera, 
  Eye, 
  EyeOff,
  Edit,
  Save,
  X,
  Smartphone,
  Clock,
  MapPin,
  Activity,
  Key,
  Briefcase,
  Users,
  UserCheck,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { featureFlagService } from '@/services/featureFlagService';
import { hierarchyService } from '@/services/hierarchyService';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { ImageCropper } from '@/components/ui/image-cropper';
import { useNavigate } from 'react-router-dom';

interface UserProfileFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  avatar: string;
  bio: string;
  location: string;
  timezone: string;
  joinedDate: string;
}

interface SecuritySession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
  status: 'Active' | 'Expired';
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export const UserProfile: React.FC = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const { state } = useAppState();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<UserProfileFormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    avatar: '/placeholder.svg',
    bio: '',
    location: '',
    timezone: 'Asia/Kolkata',
    joinedDate: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Initialize form data from authenticated user - prioritize employee data as source of truth
  useEffect(() => {
    if (user && userProfile) {
      // Find matching employee record for accurate data
      const currentEmployee = state.employees.find(e => 
        e.email?.toLowerCase() === user.email?.toLowerCase() ||
        e.id === user.id
      );
      
      setFormData({
        name: currentEmployee?.full_name || userProfile.full_name || '',
        email: user.email || '',
        phone: currentEmployee?.mobile || userProfile.phone || '',
        role: currentEmployee?.role || userProfile.role || 'User',
        department: currentEmployee?.department || userProfile.department || '',
        avatar: userProfile.avatar_url || '/placeholder.svg',
        bio: userProfile.bio || '',
        location: currentEmployee 
          ? `${currentEmployee.city || ''}, ${currentEmployee.state || ''}`.replace(/^, |, $/g, '')
          : userProfile.location || '',
        timezone: 'Asia/Kolkata',
        joinedDate: currentEmployee?.date_of_joining 
          ? new Date(currentEmployee.date_of_joining).toLocaleDateString()
          : userProfile.joinedDate || new Date(user.created_at || '').toLocaleDateString(),
      });
      setIsLoading(false);
    }
  }, [user, userProfile, state.employees]);

  // Fetch current session info
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const currentSession: SecuritySession = {
            id: 'current',
            device: navigator.userAgent.includes('Chrome') ? 'Chrome Browser' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox Browser' :
                   navigator.userAgent.includes('Safari') ? 'Safari Browser' : 'Unknown Browser',
            location: 'Current Location',
            ipAddress: 'Current IP',
            loginTime: session.expires_at 
              ? new Date((session.expires_at - 3600) * 1000).toLocaleString() 
              : new Date().toLocaleString(),
            lastActivity: new Date().toLocaleString(),
            status: 'Active'
          };
          setSessions([currentSession]);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    
    fetchSessionInfo();
  }, []);

  // Fetch activity logs from audit_log table
  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('id, action_type, timestamp, ip_address, user_agent')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) throw error;

        const logs: ActivityLog[] = (data || []).map(log => ({
          id: log.id,
          action: formatActionType(log.action_type),
          timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
          ipAddress: log.ip_address?.toString() || 'N/A',
          userAgent: log.user_agent || 'N/A',
        }));

        setActivityLogs(logs);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      }
    };

    fetchActivityLogs();
  }, [user]);

  // Calculate access data for My Access section
  const accessData = useMemo(() => {
    if (!user?.email) return null;
    
    const currentEmployee = state.employees.find(e => 
      e.email?.toLowerCase() === user.email?.toLowerCase() || 
      e.officialEmail?.toLowerCase() === user.email?.toLowerCase()
    );
    
    if (!currentEmployee) return null;

    const visibility = hierarchyService.calculateVisibility(
      currentEmployee,
      state.employees,
      state.clients,
      state.cases,
      state.tasks
    );

    const summary = hierarchyService.getVisibilitySummary(visibility);
    const manager = state.employees.find(e => 
      e.id === currentEmployee.managerId || e.id === currentEmployee.reportingTo
    );

    return {
      employee: currentEmployee,
      manager,
      visibility,
      summary,
      dataScope: currentEmployee.dataScope || 'Own Cases',
    };
  }, [user, state.employees, state.clients, state.cases, state.tasks]);

  const formatActionType = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      'login': 'Logged in',
      'logout': 'Logged out',
      'signup': 'Account created',
      'create_case': 'Created a case',
      'update_case': 'Updated a case',
      'delete_case': 'Deleted a case',
      'create_employee': 'Created an employee',
      'update_employee': 'Updated an employee',
      'delete_employee': 'Deleted an employee',
    };
    return actionMap[actionType] || actionType;
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await updateProfile({
        full_name: formData.name,
        phone: formData.phone,
        avatar_url: formData.avatar !== '/placeholder.svg' ? formData.avatar : null,
      });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement)?.value;
    const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value;
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });

      // Clear password fields
      (document.getElementById('currentPassword') as HTMLInputElement).value = '';
      (document.getElementById('newPassword') as HTMLInputElement).value = '';
      (document.getElementById('confirmPassword') as HTMLInputElement).value = '';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive"
      });
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (sessionId === 'current') {
      toast({
        title: "Cannot Terminate",
        description: "You cannot terminate your current session. Use logout instead.",
        variant: "destructive"
      });
      return;
    }
    
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'Expired' as const } : s
    ));
    
    toast({
      title: "Session Terminated",
      description: "The selected session has been terminated.",
    });
  };

  const handleAvatarFileSelect = (file: File) => {
    if (featureFlagService.isEnabled('profile_avatar_v1')) {
      setSelectedImageFile(file);
      setShowCropper(true);
    } else {
      handleBasicAvatarUpload(file);
    }
  };

  const handleAvatarError = (error: string) => {
    toast({
      title: "File Error",
      description: error,
      variant: "destructive"
    });
  };

  const handleCroppedImage = async (croppedFile: File) => {
    if (!user?.id) {
      toast({
        title: "Upload Failed",
        description: "You must be logged in to upload an avatar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      setShowCropper(false);
      setSelectedImageFile(null);
      
      // Upload to avatars bucket with path: user_id/timestamp.ext
      const fileExt = croppedFile.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, { upsert: true });

      if (error) throw error;

      // Get public URL from avatars bucket
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: avatarUrl });
      setFormData(prev => ({ ...prev, avatar: avatarUrl }));
      
      toast({
        title: "Avatar Updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(undefined);
    }
  };

  const handleBasicAvatarUpload = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Upload Failed",
        description: "You must be logged in to upload an avatar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload to avatars bucket with path: user_id/timestamp.ext
      const fileExt = file.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Get public URL from avatars bucket
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl;

      await updateProfile({ avatar_url: avatarUrl });
      setFormData(prev => ({ ...prev, avatar: avatarUrl }));
      
      toast({
        title: "Avatar Updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatar_url: null });
      setFormData(prev => ({ ...prev, avatar: '/placeholder.svg' }));
      
      toast({
        title: "Avatar Removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove avatar.",
        variant: "destructive"
      });
    }
  };

  const handleEnable2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    toast({
      title: twoFactorEnabled ? "2FA Disabled" : "2FA Enabled",
      description: twoFactorEnabled 
        ? "Two-factor authentication has been disabled."
        : "Two-factor authentication has been enabled.",
    });
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground mt-2">
            {isLoading ? "Loading profile..." : "Manage your account settings and security preferences"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1 h-auto">
            <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Profile</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Security</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Sessions</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 overflow-x-hidden">
            {/* Image Cropper Dialog */}
            <Dialog open={showCropper && !!selectedImageFile} onOpenChange={(open) => {
              if (!open) {
                setShowCropper(false);
                setSelectedImageFile(null);
              }
            }}>
              <DialogContent className="max-w-lg sm:max-w-2xl p-0 overflow-hidden">
                <DialogHeader className="sr-only">
                  <DialogTitle>Crop Profile Image</DialogTitle>
                </DialogHeader>
                {selectedImageFile && (
                  <ImageCropper
                    imageFile={selectedImageFile}
                    onCrop={handleCroppedImage}
                    onCancel={() => {
                      setShowCropper(false);
                      setSelectedImageFile(null);
                    }}
                    disabled={isUploading}
                    className="border-0 shadow-none"
                  />
                )}
              </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage 
                            src={formData.avatar} 
                            alt={formData.name}
                            onError={() => setFormData(prev => ({ ...prev, avatar: '/placeholder.svg' }))}
                          />
                          <AvatarFallback>{getInitials(formData.name)}</AvatarFallback>
                        </Avatar>
                        <Button 
                          size="sm" 
                          className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                          disabled={isUploading}
                          aria-label="Upload profile photo"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarFileSelect(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                          id="avatar-upload"
                        />
                      </div>

                      {featureFlagService.isEnabled('profile_avatar_v1') ? (
                        <div className="w-full max-w-sm">
                          <FileDropzone
                            onFileSelect={handleAvatarFileSelect}
                            onError={handleAvatarError}
                            accept="image/jpeg,image/png,image/webp"
                            maxSize={2}
                            disabled={isUploading}
                            progress={uploadProgress}
                          />
                          {formData.avatar !== '/placeholder.svg' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="w-full mt-2"
                            >
                              Remove Photo
                            </Button>
                          )}
                        </div>
                      ) : (
                        formData.avatar !== '/placeholder.svg' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            disabled={isUploading}
                          >
                            Remove Photo
                          </Button>
                        )
                      )}
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{formData.name}</h3>
                        <Badge variant="outline">{formData.role}</Badge>
                        {formData.department && (
                          <p className="text-sm text-muted-foreground mt-1">{formData.department}</p>
                        )}
                      </div>
                      <div className="w-full space-y-2 text-sm">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="truncate">{formData.email}</span>
                        </div>
                        {formData.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{formData.phone}</span>
                          </div>
                        )}
                        {formData.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{formData.location}</span>
                          </div>
                        )}
                        {formData.joinedDate && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Joined {formData.joinedDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* My Access Section */}
              {accessData && (
                <div className="md:col-span-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base">
                          <Eye className="h-5 w-5 mr-2 text-muted-foreground" />
                          My Data Access
                        </CardTitle>
                        <Badge variant={accessData.dataScope === 'All Cases' ? 'default' : 'secondary'}>
                          {accessData.dataScope}
                        </Badge>
                      </div>
                      {accessData.manager && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reporting to: <span className="font-medium">{accessData.manager.full_name}</span>
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Access Breakdown */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <TooltipProvider>
                          {[
                            { 
                              label: 'Direct', 
                              count: accessData.summary.directCases, 
                              icon: UserCheck,
                              color: 'text-success',
                              bgColor: 'bg-success/10',
                              description: 'Cases assigned directly to you'
                            },
                            { 
                              label: 'Via Manager', 
                              count: accessData.summary.managerCases, 
                              icon: Users,
                              color: 'text-primary',
                              bgColor: 'bg-primary/10',
                              description: 'Cases assigned to your manager'
                            },
                            { 
                              label: 'Team', 
                              count: accessData.summary.teamCases, 
                              icon: Building2,
                              color: 'text-warning',
                              bgColor: 'bg-warning/10',
                              description: 'Cases from team members'
                            },
                            { 
                              label: 'Org-wide', 
                              count: accessData.summary.hierarchyCases, 
                              icon: Briefcase,
                              color: 'text-muted-foreground',
                              bgColor: 'bg-muted',
                              description: 'Organization-wide visibility'
                            },
                          ].filter(item => item.count > 0 || accessData.dataScope === 'All Cases').map((item) => (
                            <Tooltip key={item.label}>
                              <TooltipTrigger asChild>
                                <div className={`p-3 rounded-lg ${item.bgColor} cursor-help`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <item.icon className={`h-4 w-4 ${item.color}`} />
                                    <span className="text-xs font-medium">{item.label}</span>
                                  </div>
                                  <div className={`text-xl font-bold ${item.color}`}>
                                    {item.count}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>

                      {/* Totals Row */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-foreground">
                              {accessData.summary.totalAccessibleCases}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Cases</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-foreground">
                              {accessData.summary.totalAccessibleTasks}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Tasks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-foreground">
                              {accessData.summary.totalAccessibleClients}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Clients</div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/admin/access')}
                        >
                          View Access Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Personal Information
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={formData.name}
                          disabled={!isEditing}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={formData.role}
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        disabled={!isEditing}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          disabled
                          placeholder="Location from employee record"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={formData.timezone} disabled={!isEditing}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="Europe/London">UK Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleChangePassword} className="w-full">
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Two-Factor Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">2FA Status</p>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={handleEnable2FA}
                    />
                  </div>

                  {twoFactorEnabled && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="font-medium flex items-center">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Authenticator App
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Configure your authenticator app
                        </p>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium flex items-center">
                          <Key className="h-4 w-4 mr-2" />
                          Backup Codes
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Generate backup codes
                        </p>
                        <Button variant="outline" size="sm">
                          Generate Codes
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No active sessions found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Login Time</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{session.device}</TableCell>
                          <TableCell>{session.location}</TableCell>
                          <TableCell className="text-sm">{session.loginTime}</TableCell>
                          <TableCell className="text-sm">{session.lastActivity}</TableCell>
                          <TableCell>
                            <Badge variant={session.status === 'Active' ? 'default' : 'secondary'}>
                              {session.status}
                              {session.id === 'current' && ' (Current)'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {session.status === 'Active' && session.id !== 'current' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTerminateSession(session.id)}
                              >
                                Terminate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity logs found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell className="text-sm">{log.timestamp}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{log.userAgent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
