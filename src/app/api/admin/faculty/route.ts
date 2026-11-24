import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const requestSchema=z.object({
  fullName:z.string().trim().min(2).max(120),
  email:z.string().trim().email().max(254),
  employeeId:z.string().trim().min(2).max(64),
  subjectId:z.string().uuid().optional().or(z.literal("")),
});

export async function POST(request:Request){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anonKey||!serviceKey)return NextResponse.json({error:"Faculty invitations require server-side Supabase configuration."},{status:503});
  const cookieStore=await cookies();
  const supabase=createServerClient(url,anonKey,{cookies:{getAll:()=>cookieStore.getAll(),setAll(cookies){cookies.forEach(({name,value,options})=>cookieStore.set(name,value,options));}}});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(profileError||profile?.role!=="SUPER_ADMIN")return NextResponse.json({error:"Super-admin authorization required."},{status:403});

  const parsed=requestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Provide a valid name, email, employee ID, and optional subject."},{status:400});
  const {fullName,email,employeeId,subjectId}=parsed.data;
  const admin=createSupabaseAdminClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName,registration_number:employeeId}});
  if(inviteError||!invited.user)return NextResponse.json({error:inviteError?.message??"Faculty invitation failed."},{status:400});

  const {error:roleError}=await admin.from("profiles").update({role:"FACULTY",registration_number:employeeId,full_name:fullName}).eq("id",invited.user.id);
  if(roleError){
    const {error:cleanupError}=await admin.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({error:`Faculty profile setup failed: ${roleError.message}${cleanupError?` Cleanup failed: ${cleanupError.message}`:""}`},{status:500});
  }
  if(subjectId){
    const {error:assignmentError}=await admin.from("subject_faculty").insert({subject_id:subjectId,faculty_id:invited.user.id});
    if(assignmentError){
      const {error:cleanupError}=await admin.auth.admin.deleteUser(invited.user.id);
      return NextResponse.json({error:`Subject assignment failed: ${assignmentError.message}${cleanupError?` Cleanup failed: ${cleanupError.message}`:""}`},{status:500});
    }
  }
  const {error:auditError}=await admin.from("audit_logs").insert({actor_id:user.id,action:"FACULTY_INVITED",entity_type:"profile",entity_id:invited.user.id,details:{email,employee_id:employeeId}});
  if(auditError)return NextResponse.json({error:`Faculty invited, but audit logging failed: ${auditError.message}`},{status:500});
  return NextResponse.json({success:true});
}
