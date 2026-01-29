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
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { MyPermissionsPanel } from './MyPermissionsPanel';
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
import { getPasswordErrorMessage } from '@/utils/errorUtils';
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

    // CRITICAL FIX: Handle both camelCase and snake_case field names
    const managerId = currentEmployee.managerId || 
                      currentEmployee.reportingTo ||
                      (currentEmployee as any).reporting_to;
    
    const manager = managerId 
      ? state.employees.find(e => e.id === managerId)
      : null;

    // CRITICAL FIX: Use hierarchyService to get normalized dataScope
    const normalizedDataScope = hierarchyService.getEmployeeDataScope(currentEmployee);

    // CRITICAL FIX: Use actual state counts (already RLS-filtered by database)
    const actualCounts = {
      cases: state.cases.length,
      tasks: state.tasks.length,
      clients: state.clients.length,
    };

    // Calculate breakdown from actual RLS-filtered cases
    const breakdown = {
      direct: 0,
      viaManager: 0,
      team: 0,
      orgWide: 0,
    };

    state.cases.forEach(caseItem => {
      const assignedToId = (caseItem as any).assignedToId || (caseItem as any).assigned_to;
      const ownerId = (caseItem as any).ownerId || (caseItem as any).owner_id;
      
      if (assignedToId === currentEmployee.id || ownerId === currentEmployee.id) {
        breakdown.direct++;
      } else if (managerId && (assignedToId === managerId || ownerId === managerId)) {
        breakdown.viaManager++;
      } else if (managerId) {
        const caseOwnerOrAssignee = state.employees.find(e => 
          e.id === assignedToId || e.id === ownerId
        );
        const caseEmployeeManagerId = caseOwnerOrAssignee?.managerId || 
                                       caseOwnerOrAssignee?.reportingTo ||
                                       (caseOwnerOrAssignee as any)?.reporting_to;
        
        if (caseEmployeeManagerId === managerId) {
          breakdown.team++;
        } else {
          breakdown.orgWide++;
        }
      } else {
        breakdown.orgWide++;
      }
    });

    return {
      employee: currentEmployee,
      manager,
      dataScope: normalizedDataScope,
      actualCounts,
      breakdown,
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
    } catch (error: unknown) {
      const passwordError = getPasswordErrorMessage(error);
      toast({
        title: passwordError.title,
        description: passwordError.guidance 
          ? `${passwordError.description} ${passwordError.guidance[0]}`
          : passwordError.description,
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
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading profile..." : "Manage your account settings and preferences"}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 p-1 h-auto bg-muted/50">
            <TabsTrigger value="profile" className="text-xs sm:text-sm py-2.5 px-3">Profile</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs sm:text-sm py-2.5 px-3 gap-1">
              <ShieldCheck className="h-3.5 w-3.5 hidden sm:inline" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm py-2.5 px-3">Security</TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm py-2.5 px-3">Sessions</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm py-2.5 px-3">Activity</TabsTrigger>
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

            {/* Main Grid - 12 column system for precise control */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-12">
              {/* Avatar Card - Narrow left column */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="md:col-span-4 lg:col-span-3"
              >
                <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex flex-col items-center space-y-4">
                      {/* Avatar with hover effect */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background shadow-lg transition-transform group-hover:scale-105">
                                <AvatarImage 
                                  src={formData.avatar} 
                                  alt={formData.name}
                                  onError={() => setFormData(prev => ({ ...prev, avatar: '/placeholder.svg' }))}
                                />
                                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                                  {getInitials(formData.name)}
                                </AvatarFallback>
                              </Avatar>
                              <Button 
                                size="sm" 
                                className="absolute -bottom-1 -right-1 rounded-full h-9 w-9 p-0 shadow-md"
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
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click the camera icon to update your photo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* File Dropzone for advanced upload */}
                      {featureFlagService.isEnabled('profile_avatar_v1') && (
                        <div className="w-full">
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
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="w-full mt-2 text-muted-foreground hover:text-destructive"
                            >
                              Remove Photo
                            </Button>
                          )}
                        </div>
                      )}

                      {/* User info */}
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">{formData.name}</h3>
                        <Badge variant="secondary" className="font-medium">{formData.role}</Badge>
                        {formData.department && (
                          <p className="text-sm text-muted-foreground">{formData.department}</p>
                        )}
                      </div>

                      <Separator className="w-full" />

                      {/* Contact details with tooltips */}
                      <div className="w-full space-y-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-help">
                                <div className="p-2 rounded-md bg-primary/10">
                                  <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm truncate flex-1">{formData.email}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="font-medium">Login Email</p>
                              <p className="text-xs text-muted-foreground">Cannot be changed for security</p>
                            </TooltipContent>
                          </Tooltip>

                          {formData.phone && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-help">
                                  <div className="p-2 rounded-md bg-success/10">
                                    <Phone className="h-4 w-4 text-success" />
                                  </div>
                                  <span className="text-sm">{formData.phone}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="font-medium">Contact Number</p>
                                <p className="text-xs text-muted-foreground">Visible to your team members</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {formData.location && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-help">
                                  <div className="p-2 rounded-md bg-warning/10">
                                    <MapPin className="h-4 w-4 text-warning" />
                                  </div>
                                  <span className="text-sm">{formData.location}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="font-medium">Office Location</p>
                                <p className="text-xs text-muted-foreground">From your employee record</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {formData.joinedDate && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-help">
                                  <div className="p-2 rounded-md bg-accent">
                                    <Clock className="h-4 w-4 text-accent-foreground" />
                                  </div>
                                  <span className="text-sm">Joined {formData.joinedDate}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="font-medium">Member Since</p>
                                <p className="text-xs text-muted-foreground">Date you joined the organization</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* My Access Section - Wide right column */}
              {accessData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="md:col-span-8 lg:col-span-9"
                >
                  <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Eye className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg">My Data Access</CardTitle>
                            {accessData.manager && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Reporting to: <span className="font-medium text-foreground">{accessData.manager.full_name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={accessData.dataScope === 'All Cases' ? 'default' : 'secondary'}
                                className="cursor-help w-fit"
                              >
                                {accessData.dataScope}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Data Visibility Level</p>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                Your visibility level determines what cases, tasks, and clients you can access in the system
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Access Breakdown - Responsive grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <TooltipProvider>
                          {[
                            { 
                              label: 'Direct', 
                              count: accessData.breakdown.direct, 
                              icon: UserCheck,
                              color: 'text-success',
                              bgColor: 'bg-success/10',
                              borderColor: 'border-success/20',
                              description: 'Cases assigned directly to you or where you are the owner'
                            },
                            { 
                              label: 'Via Manager', 
                              count: accessData.breakdown.viaManager, 
                              icon: Users,
                              color: 'text-primary',
                              bgColor: 'bg-primary/10',
                              borderColor: 'border-primary/20',
                              description: 'Cases visible through your reporting manager'
                            },
                            { 
                              label: 'Team', 
                              count: accessData.breakdown.team, 
                              icon: Building2,
                              color: 'text-warning',
                              bgColor: 'bg-warning/10',
                              borderColor: 'border-warning/20',
                              description: 'Cases from team members who share your manager'
                            },
                            { 
                              label: 'Org-wide', 
                              count: accessData.breakdown.orgWide, 
                              icon: Briefcase,
                              color: 'text-muted-foreground',
                              bgColor: 'bg-muted',
                              borderColor: 'border-border',
                              description: 'Cases accessible due to organization-wide visibility settings'
                            },
                          ].filter(item => item.count > 0 || accessData.dataScope === 'All Cases').map((item) => (
                            <Tooltip key={item.label}>
                              <TooltipTrigger asChild>
                                <div className={`p-3 sm:p-4 rounded-xl border ${item.bgColor} ${item.borderColor} cursor-help transition-all hover:scale-[1.02] hover:shadow-sm`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <item.icon className={`h-4 w-4 ${item.color}`} />
                                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                                  </div>
                                  <div className={`text-2xl sm:text-3xl font-bold ${item.color}`}>
                                    {item.count}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-medium">{item.label} Access</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>

                      <Separator />

                      {/* Totals Row - Better alignment */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center justify-around sm:justify-start sm:gap-8">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-center cursor-help">
                                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {accessData.actualCounts.cases}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">Total Cases</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Accessible Cases</p>
                                <p className="text-xs text-muted-foreground">All cases you have permission to view based on your role</p>
                              </TooltipContent>
                            </Tooltip>

                            <div className="h-10 w-px bg-border hidden sm:block" />

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-center cursor-help">
                                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {accessData.actualCounts.tasks}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">Total Tasks</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Your Tasks</p>
                                <p className="text-xs text-muted-foreground">Tasks assigned to you or visible through your team</p>
                              </TooltipContent>
                            </Tooltip>

                            <div className="h-10 w-px bg-border hidden sm:block" />

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-center cursor-help">
                                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {accessData.actualCounts.clients}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">Total Clients</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Accessible Clients</p>
                                <p className="text-xs text-muted-foreground">Clients you can view and manage</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/admin/access')}
                          className="w-full sm:w-auto group"
                        >
                          View Access Details
                          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Personal Information Card - Full width */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="col-span-full"
              >
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <User className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
                      </div>
                      <Button
                        variant={isEditing ? "ghost" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="gap-2"
                      >
                        {isEditing ? (
                          <>
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Cancel</span>
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Two column grid for form fields */}
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Activity className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Your display name shown across the system</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="fullName"
                            value={formData.name}
                            disabled={!isEditing}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Activity className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Your role is set by administrators</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="role"
                            value={formData.role}
                            disabled
                            className="h-10 bg-muted/30"
                          />
                        </div>
                      </TooltipProvider>
                    </div>
                    
                    <div className="space-y-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cannot be changed - contact admin for updates</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="h-10 bg-muted/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        disabled={!isEditing}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="h-10"
                      />
                    </div>

                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                      <TooltipProvider>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Activity className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Synced from your employee profile</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="location"
                            value={formData.location}
                            disabled
                            placeholder="Location from employee record"
                            className="h-10 bg-muted/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Activity className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Used for scheduling and date display</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select value={formData.timezone} disabled={!isEditing}>
                            <SelectTrigger className="h-10">
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
                      </TooltipProvider>
                    </div>

                    {/* Save buttons */}
                    {isEditing && (
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile} className="w-full sm:w-auto gap-2">
                          <Save className="h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <MyPermissionsPanel />
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
