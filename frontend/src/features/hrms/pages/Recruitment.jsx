import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import {
  Briefcase, Users, Calendar, Plus, Edit3, X, Check, FileText,
  Mail, Phone, Clock, Star, ExternalLink, ChevronRight, UserCheck, Trash2
} from 'lucide-react';

const stages = ['Applied', 'Screening', 'Interviewing', 'Offered', 'Hired', 'Rejected'];
const stageColors = {
  'Applied': '#38bdf8', // light blue
  'Screening': '#fbbf24', // yellow
  'Interviewing': '#a78bfa', // purple
  'Offered': '#f472b6', // pink
  'Hired': '#34d399', // emerald
  'Rejected': '#f87171' // red
};

const Recruitment = () => {
  const { toast, tenantId, activeRole } = useHRMS();

  const [activeTab, setActiveTab] = useState('jobs');
  
  // Data States
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals / Drawer States
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateDrawer, setShowCandidateDrawer] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Forms
  const [jobForm, setJobForm] = useState({
    title: '', department_id: '', designation_id: '', description: '',
    requirements: '', experience_required: '', vacancies: 1, status: 'Open'
  });

  const [candidateForm, setCandidateForm] = useState({
    job_opening_id: '', first_name: '', last_name: '', email: '',
    phone: '', source: 'Direct', experience_years: 0.0, resume: null
  });

  const [interviewForm, setInterviewForm] = useState({
    candidate_id: '', interviewer_employee_id: '', interview_date: '',
    round_name: '', status: 'Scheduled'
  });

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0, feedback: '', status: 'Completed'
  });

  const [onboardForm, setOnboardForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', gender: '', dob: '',
    blood_group: '', address: '', department_id: '', designation_id: '',
    date_of_joining: '', employment_type: 'Full-time', status: 'Active',
    bank_name: '', account_number: '', ifsc_code: '', pan_number: ''
  });

  // Fetch functions
  const fetchData = useCallback(() => {
    setLoading(true);
    const params = `?tenant_id=${tenantId}`;
    Promise.all([
      fetch(`${apiBaseUrl}/hrms/jobs${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/candidates${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/interviews${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/employees${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/departments${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/designations${params}`).then(r => r.json())
    ]).then(([jobsRes, candRes, intRes, empRes, deptRes, desgRes]) => {
      if (jobsRes.success) setJobs(jobsRes.data || []);
      if (candRes.success) setCandidates(candRes.data || []);
      if (intRes.success) setInterviews(intRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (desgRes.success) setDesignations(desgRes.data || []);
    }).catch(err => {
      console.error("Error fetching recruitment data:", err);
    }).finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Job Handlers
  const handleJobSubmit = (e) => {
    e.preventDefault();
    if (!jobForm.title) {
      toast.error("Job title is required.");
      return;
    }
    const isEdit = !!editingJob;
    const payload = { ...jobForm, tenant_id: tenantId };
    if (isEdit) payload.id = editingJob.id;

    fetch(`${apiBaseUrl}/hrms/jobs`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(isEdit ? "Job opening updated!" : "Job opening created!");
          setShowJobModal(false);
          fetchData();
        } else {
          toast.error(data.error || "Save failed.");
        }
      });
  };

  const openEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      department_id: job.department_id || '',
      designation_id: job.designation_id || '',
      description: job.description || '',
      requirements: job.requirements || '',
      experience_required: job.experience_required || '',
      vacancies: job.vacancies || 1,
      status: job.status || 'Open'
    });
    setShowJobModal(true);
  };

  const handleDeleteJob = (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job opening? This will delete associated candidates and schedules.")) return;
    fetch(`${apiBaseUrl}/hrms/jobs?id=${jobId}&tenant_id=${tenantId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success("Job opening deleted.");
          fetchData();
        } else {
          toast.error(data.error);
        }
      });
  };

  // Candidate Handlers
  const handleCandidateSubmit = (e) => {
    e.preventDefault();
    if (!candidateForm.job_opening_id || !candidateForm.first_name || !candidateForm.last_name || !candidateForm.email) {
      toast.error("Missing required candidate parameters.");
      return;
    }

    const formData = new FormData();
    formData.append('tenant_id', tenantId);
    Object.keys(candidateForm).forEach(k => {
      if (k === 'resume' && candidateForm.resume) {
        formData.append('resume', candidateForm.resume);
      } else {
        formData.append(k, candidateForm[k]);
      }
    });

    fetch(`${apiBaseUrl}/hrms/candidates`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success("Candidate application submitted successfully!");
          setShowCandidateModal(false);
          setCandidateForm({ job_opening_id: '', first_name: '', last_name: '', email: '', phone: '', source: 'Direct', experience_years: 0.0, resume: null });
          fetchData();
        } else {
          toast.error(data.error || "Save failed.");
        }
      });
  };

  const handleUpdateStage = (candId, newStage) => {
    fetch(`${apiBaseUrl}/hrms/candidates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: candId, stage: newStage, tenant_id: tenantId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Candidate stage advanced to ${newStage}.`);
          fetchData();
          if (selectedCandidate && selectedCandidate.id === candId) {
            setSelectedCandidate(prev => ({ ...prev, stage: newStage }));
          }
        } else {
          toast.error(data.error);
        }
      });
  };

  // Interview Handlers
  const handleInterviewSubmit = (e) => {
    e.preventDefault();
    if (!interviewForm.candidate_id || !interviewForm.interviewer_employee_id || !interviewForm.interview_date || !interviewForm.round_name) {
      toast.error("All interview parameters are required.");
      return;
    }

    fetch(`${apiBaseUrl}/hrms/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...interviewForm, tenant_id: tenantId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success("Interview schedule booked successfully!");
          setShowInterviewModal(false);
          fetchData();
        } else {
          toast.error(data.error);
        }
      });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    fetch(`${apiBaseUrl}/hrms/interviews`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedInterview.id, ...feedbackForm, tenant_id: tenantId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success("Interview round feedback captured!");
          setShowFeedbackModal(false);
          fetchData();
        } else {
          toast.error(data.error);
        }
      });
  };

  // Onboard Flow
  const launchOnboard = (candidate) => {
    // Look up job details to populate department/designation
    const job = jobs.find(j => j.id === candidate.job_opening_id) || {};
    
    setOnboardForm({
      first_name: candidate.first_name || '',
      last_name: candidate.last_name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      gender: '',
      dob: '',
      blood_group: '',
      address: '',
      department_id: job.department_id || '',
      designation_id: job.designation_id || '',
      date_of_joining: new Date().toISOString().split('T')[0],
      employment_type: 'Full-time',
      status: 'Active',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      pan_number: ''
    });
    
    setSelectedCandidate(candidate);
    setShowOnboardModal(true);
  };

  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    if (!onboardForm.first_name || !onboardForm.last_name || !onboardForm.email) {
      toast.error("First name, last name, and email are required for onboarding.");
      return;
    }

    fetch(`${apiBaseUrl}/hrms/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...onboardForm, tenant_id: tenantId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Employee created! Code: ${data.emp_code}`);
          setShowOnboardModal(false);
          // Update Candidate stage to Hired
          handleUpdateStage(selectedCandidate.id, 'Hired');
          setShowCandidateDrawer(false);
          fetchData();
        } else {
          toast.error(data.error || "Onboarding failed.");
        }
      });
  };

  const openCandidateDrawer = (candidate) => {
    // Get full details
    fetch(`${apiBaseUrl}/hrms/candidates?id=${candidate.id}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSelectedCandidate(data.data);
          setShowCandidateDrawer(true);
        }
      });
  };

  const filteredDesignations = jobForm.department_id
    ? designations.filter(d => String(d.department_id) === String(jobForm.department_id))
    : designations;

  const filteredOnboardDesignations = onboardForm.department_id
    ? designations.filter(d => String(d.department_id) === String(onboardForm.department_id))
    : designations;

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sub tabs & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'jobs', label: 'Job Openings', icon: Briefcase },
            { id: 'pipeline', label: 'Candidate Pipeline', icon: Users },
            { id: 'interviews', label: 'Interviews & Schedules', icon: Calendar }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="modal-btn secondary" style={{
              padding: '8px 18px', fontSize: '12.5px', fontWeight: 600, borderRadius: 'var(--radius-md)',
              background: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeRole !== 'Sales Associate' && (
          <div>
            {activeTab === 'jobs' && (
              <button className="add-lead-btn" onClick={() => { setEditingJob(null); setJobForm({ title: '', department_id: '', designation_id: '', description: '', requirements: '', experience_required: '', vacancies: 1, status: 'Open' }); setShowJobModal(true); }} style={{ gap: '6px' }}>
                <Plus size={16} /> Post Job Opening
              </button>
            )}
            {activeTab === 'pipeline' && (
              <button className="add-lead-btn" onClick={() => { setCandidateForm({ job_opening_id: '', first_name: '', last_name: '', email: '', phone: '', source: 'Direct', experience_years: 0.0, resume: null }); setShowCandidateModal(true); }} style={{ gap: '6px' }}>
                <Plus size={16} /> Add Candidate
              </button>
            )}
            {activeTab === 'interviews' && (
              <button className="add-lead-btn" onClick={() => { setInterviewForm({ candidate_id: '', interviewer_employee_id: '', interview_date: '', round_name: '', status: 'Scheduled' }); setShowInterviewModal(true); }} style={{ gap: '6px' }}>
                <Calendar size={16} /> Schedule Interview
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading recruitment panel details...</div>
      ) : (
        <>
          {/* TAB 1: JOB OPENINGS BOARD */}
          {activeTab === 'jobs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {jobs.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                  No job vacancies cataloged yet. Post a job opening to start.
                </div>
              ) : jobs.map(job => (
                <div key={job.id} style={{
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '14px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-white)' }}>{job.title}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                        {job.department_name || 'General'} · {job.designation_name || 'Staff'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: job.status === 'Open' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: job.status === 'Open' ? 'var(--accent-emerald)' : 'var(--accent-red)',
                      border: `1px solid ${job.status === 'Open' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>{job.status}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div>Experience: <strong style={{ color: 'var(--text-primary)' }}>{job.experience_required || 'Any'}</strong></div>
                    <div>Vacancies: <strong style={{ color: 'var(--text-primary)' }}>{job.vacancies}</strong></div>
                    <div>Applied: <strong style={{ color: 'var(--accent-cyan)' }}>{job.candidates_count}</strong></div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                    {job.description || 'No description cataloged.'}
                  </div>

                  {activeRole !== 'Sales Associate' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                      <button className="modal-btn secondary" onClick={() => openEditJob(job)} style={{ fontSize: '11.5px', padding: '6px 12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                      <button className="modal-btn secondary" onClick={() => handleDeleteJob(job.id)} style={{ fontSize: '11.5px', padding: '6px 12px', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.2)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: CANDIDATE KANBAN BOARD */}
          {activeTab === 'pipeline' && (
            <div style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              paddingBottom: '16px',
              alignItems: 'flex-start'
            }}>
              {stages.map(stage => {
                const stageCandidates = candidates.filter(c => c.stage === stage);
                return (
                  <div key={stage} style={{
                    flex: '0 0 280px',
                    background: 'rgba(20, 27, 45, 0.4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '75vh'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColors[stage] }}></span>
                        {stage}
                      </span>
                      <span style={{ fontSize: '11px', background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {stageCandidates.length}
                      </span>
                    </div>

                    {/* Cards Scroll */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      flex: 1,
                      minHeight: '200px'
                    }}>
                      {stageCandidates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                          No candidates
                        </div>
                      ) : stageCandidates.map(cand => (
                        <div 
                          key={cand.id} 
                          onClick={() => openCandidateDrawer(cand)}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', display: 'block' }}>
                              {cand.first_name} {cand.last_name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'block', marginTop: '2px' }}>
                              {cand.job_title}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={11} /> {cand.email}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={11} /> Exp: {cand.experience_years} Years</span>
                          </div>

                          {cand.resume_path && (
                            <span style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FileText size={10} /> Resume Uploaded
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: INTERVIEW TIMELINE */}
          {activeTab === 'interviews' && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
                Scheduled Interviews Dashboard
              </h3>

              <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto' }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Job Opening</th>
                      <th>Scheduled Date & Time</th>
                      <th>Round Name</th>
                      <th>Assigned Interviewer</th>
                      <th>Status</th>
                      <th>Rating & Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No interviews scheduled. Book a round to start.
                        </td>
                      </tr>
                    ) : interviews.map(int => {
                      const dateObj = new Date(int.interview_date);
                      return (
                        <tr key={int.id}>
                          <td 
                            onClick={() => openCandidateDrawer({ id: int.candidate_id })} 
                            style={{ cursor: 'pointer' }}
                            title="Click to view candidate info & resume"
                          >
                            <span 
                              style={{ 
                                fontWeight: 600, 
                                color: 'var(--accent-cyan)', 
                                display: 'inline-block',
                                borderBottom: '1px dashed var(--accent-cyan)',
                                marginBottom: '2px'
                              }}
                            >
                              {int.candidate_first_name} {int.candidate_last_name}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>{int.candidate_email}</span>
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{int.job_title}</td>
                          <td style={{ fontSize: '12.5px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{dateObj.toLocaleDateString()}</strong>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td style={{ fontSize: '12.5px', fontWeight: 600 }}>{int.round_name}</td>
                          <td style={{ fontSize: '12.5px' }}>{int.interviewer_name}</td>
                          <td>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                              background: int.status === 'Completed' ? 'rgba(52,211,153,0.1)' : (int.status === 'Cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'),
                              color: int.status === 'Completed' ? 'var(--accent-emerald)' : (int.status === 'Cancelled' ? 'var(--accent-red)' : 'var(--accent-blue)'),
                              border: `1px solid ${int.status === 'Completed' ? 'rgba(52,211,153,0.2)' : (int.status === 'Cancelled' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)')}`
                            }}>{int.status}</span>
                          </td>
                          <td>
                            {int.status === 'Completed' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', gap: '2px', color: 'var(--accent-yellow)' }}>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} size={11} fill={star <= int.rating ? 'currentColor' : 'none'} />
                                  ))}
                                </div>
                                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {int.feedback || '—'}
                                </span>
                              </div>
                            ) : (
                              activeRole !== 'Sales Associate' && (
                                <button className="modal-btn primary" onClick={() => { setSelectedInterview(int); setFeedbackForm({ rating: 3, feedback: '', status: 'Completed' }); setShowFeedbackModal(true); }} style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                                  Submit Feedback
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* JOB POST/EDIT MODAL */}
      {showJobModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowJobModal(false)}>
          <div className="modal-container" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingJob ? 'Edit Job Opening' : 'Post New Job Opening'}</h2>
              <button className="modal-close" onClick={() => setShowJobModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleJobSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Job Title *</label><input style={inputStyle} value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} required /></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <select style={inputStyle} value={jobForm.department_id} onChange={e => setJobForm({ ...jobForm, department_id: e.target.value, designation_id: '' })}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <select style={inputStyle} value={jobForm.designation_id} onChange={e => setJobForm({ ...jobForm, designation_id: e.target.value })}>
                      <option value="">Select Designation</option>
                      {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Experience Required (e.g. 3-5 Years)</label><input style={inputStyle} value={jobForm.experience_required} onChange={e => setJobForm({ ...jobForm, experience_required: e.target.value })} placeholder="e.g. 2-5 Years" /></div>
                  <div><label style={labelStyle}>Vacancies</label><input type="number" min="1" style={inputStyle} value={jobForm.vacancies} onChange={e => setJobForm({ ...jobForm, vacancies: e.target.value })} /></div>
                </div>

                <div><label style={labelStyle}>Job Description</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} /></div>
                <div><label style={labelStyle}>Requirements</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} placeholder="Key skills, qualifications, certifications..." /></div>
                
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={jobForm.status} onChange={e => setJobForm({ ...jobForm, status: e.target.value })}>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowJobModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingJob ? 'Update Job' : 'Post Job'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CANDIDATE POST MODAL */}
      {showCandidateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCandidateModal(false)}>
          <div className="modal-container" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Candidate</h2>
              <button className="modal-close" onClick={() => setShowCandidateModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCandidateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Target Job Opening *</label>
                  <select style={inputStyle} value={candidateForm.job_opening_id} onChange={e => setCandidateForm({ ...candidateForm, job_opening_id: e.target.value })} required>
                    <option value="">Select Opening</option>
                    {jobs.filter(j => j.status === 'Open').map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>First Name *</label><input style={inputStyle} value={candidateForm.first_name} onChange={e => setCandidateForm({ ...candidateForm, first_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={candidateForm.last_name} onChange={e => setCandidateForm({ ...candidateForm, last_name: e.target.value })} required /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Email Address *</label><input type="email" style={inputStyle} value={candidateForm.email} onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} value={candidateForm.phone} onChange={e => setCandidateForm({ ...candidateForm, phone: e.target.value })} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Experience (Years)</label><input type="number" step="0.5" min="0" style={inputStyle} value={candidateForm.experience_years} onChange={e => setCandidateForm({ ...candidateForm, experience_years: e.target.value })} /></div>
                  <div>
                    <label style={labelStyle}>Application Source</label>
                    <select style={inputStyle} value={candidateForm.source} onChange={e => setCandidateForm({ ...candidateForm, source: e.target.value })}>
                      <option value="Direct">Direct Applicant</option>
                      <option value="LinkedIn">LinkedIn Job Post</option>
                      <option value="Referral">Employee Referral</option>
                      <option value="Careers Website">Company Careers Page</option>
                      <option value="Recruitment Agency">External Headhunter</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Resume File (PDF/Word)</label>
                  <input type="file" accept=".pdf, .doc, .docx" onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.files[0] })} style={{ ...inputStyle, background: 'transparent', border: 'none', paddingLeft: 0 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowCandidateModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {showInterviewModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowInterviewModal(false)}>
          <div className="modal-container" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule Interview Round</h2>
              <button className="modal-close" onClick={() => setShowInterviewModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleInterviewSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Select Candidate *</label>
                  <select style={inputStyle} value={interviewForm.candidate_id} onChange={e => setInterviewForm({ ...interviewForm, candidate_id: e.target.value })} required>
                    <option value="">Select Candidate</option>
                    {candidates.filter(c => c.stage !== 'Hired' && c.stage !== 'Rejected').map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.job_title})</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Assign Interviewer *</label>
                  <select style={inputStyle} value={interviewForm.interviewer_employee_id} onChange={e => setInterviewForm({ ...interviewForm, interviewer_employee_id: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.designation_name || 'Staff'})</option>)}
                  </select>
                </div>

                <div><label style={labelStyle}>Interview Date & Time *</label><input type="datetime-local" style={inputStyle} value={interviewForm.interview_date} onChange={e => setInterviewForm({ ...interviewForm, interview_date: e.target.value })} required /></div>
                <div><label style={labelStyle}>Round Name (e.g. Technical Round 1) *</label><input style={inputStyle} value={interviewForm.round_name} onChange={e => setInterviewForm({ ...interviewForm, round_name: e.target.value })} placeholder="e.g. Screen Coding / System Design" required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowInterviewModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Schedule Round</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SUBMIT FEEDBACK MODAL */}
      {showFeedbackModal && selectedInterview && createPortal(
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-container" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Interview Feedback</h2>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Score Rating</span>
                  <div style={{ display: 'flex', gap: '10px', color: 'var(--accent-yellow)', fontSize: '24px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', outline: 'none' }}>
                        <Star size={28} fill={star <= feedbackForm.rating ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div><label style={labelStyle}>Feedback Comments & Assessment Details</label><textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={feedbackForm.feedback} onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })} placeholder="Detail the candidate performance, strengths, weakness, coding capabilities..." required /></div>
                
                <div>
                  <label style={labelStyle}>Interview Status</label>
                  <select style={inputStyle} value={feedbackForm.status} onChange={e => setFeedbackForm({ ...feedbackForm, status: e.target.value })}>
                    <option value="Completed">Completed / Passed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Record Feedback</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CANDIDATE DETAIL DRAWER */}
      {showCandidateDrawer && selectedCandidate && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowCandidateDrawer(false)} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '95vw',
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
            zIndex: 1001, display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)' }}>
                  {selectedCandidate.first_name} {selectedCandidate.last_name}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Candidate Application Directory</span>
              </div>
              <button onClick={() => setShowCandidateDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Details */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Job Apply Card */}
              <div style={{ padding: '16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Applying For</span>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', display: 'block', marginTop: '4px' }}>{selectedCandidate.job_title}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stage Status:</span>
                  <select 
                    value={selectedCandidate.stage} 
                    onChange={e => handleUpdateStage(selectedCandidate.id, e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                    disabled={activeRole === 'Sales Associate'}
                  >
                    {stages.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>

              {/* Personal Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Email Address</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedCandidate.email}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Phone Number</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedCandidate.phone || '—'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Experience & Source</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedCandidate.experience_years} Years · {selectedCandidate.source}</span>
                  </div>
                </div>
              </div>

              {/* Resume File */}
              {selectedCandidate.resume_path ? (
                <a 
                  href={`${apiBaseUrl}/${selectedCandidate.resume_path}`}
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--accent-emerald)',
                    fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.05)'}
                >
                  <FileText size={16} />
                  Download / View Candidate Resume
                  <ExternalLink size={12} />
                </a>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No resume file uploaded for applicant.
                </div>
              )}

              {/* Candidate Interviews Timeline */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>Interview History Logs</h4>
                
                {interviews.filter(i => i.candidate_id === selectedCandidate.id).length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No interview rounds logged yet.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {interviews.filter(i => i.candidate_id === selectedCandidate.id).map(int => (
                      <div key={int.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{int.round_name}</strong>
                          <span style={{ fontSize: '10px', color: int.status === 'Completed' ? 'var(--accent-emerald)' : 'var(--accent-blue)' }}>{int.status}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                          Interviewer: {int.interviewer_name} · {new Date(int.interview_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        {int.status === 'Completed' && (
                          <div style={{ borderTop: '1px dashed var(--border)', marginTop: '8px', paddingTop: '6px' }}>
                            <div style={{ display: 'flex', gap: '2px', color: 'var(--accent-yellow)', marginBottom: '4px' }}>
                              {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= int.rating ? 'currentColor' : 'none'} />)}
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '11px' }}>"{int.feedback}"</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Actions Footer */}
            {activeRole !== 'Sales Associate' && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => { setInterviewForm(prev => ({ ...prev, candidate_id: selectedCandidate.id, round_name: '', interview_date: '' })); setShowInterviewModal(true); }}
                  className="modal-btn secondary"
                  style={{ flex: 1, fontSize: '12.5px' }}
                >
                  Schedule Round
                </button>
                
                {selectedCandidate.stage === 'Offered' && (
                  <button 
                    onClick={() => launchOnboard(selectedCandidate)}
                    className="add-lead-btn"
                    style={{ flex: 1, background: 'var(--accent-cyan)', color: '#000', fontWeight: 700, gap: '6px', fontSize: '12.5px', justifyContent: 'center' }}
                  >
                    <UserCheck size={14} />
                    Hire & Onboard
                  </button>
                )}
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {/* HIRE & ONBOARD MODAL */}
      {showOnboardModal && selectedCandidate && createPortal(
        <div className="modal-overlay" onClick={() => setShowOnboardModal(false)}>
          <div className="modal-container" style={{ maxWidth: '750px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Employee Onboarding Creation</h2>
              <button className="modal-close" onClick={() => setShowOnboardModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleOnboardSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Onboarding candidate <strong>{selectedCandidate.first_name} {selectedCandidate.last_name}</strong>. Mapped position and applicant parameters have been pre-filled.
                </div>

                {/* Personal Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '4px 0 0' }}>Personal Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>First Name *</label><input style={inputStyle} value={onboardForm.first_name} onChange={e => setOnboardForm({ ...onboardForm, first_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={onboardForm.last_name} onChange={e => setOnboardForm({ ...onboardForm, last_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Email Address *</label><input type="email" style={inputStyle} value={onboardForm.email} onChange={e => setOnboardForm({ ...onboardForm, email: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} value={onboardForm.phone} onChange={e => setOnboardForm({ ...onboardForm, phone: e.target.value })} /></div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select style={inputStyle} value={onboardForm.gender} onChange={e => setOnboardForm({ ...onboardForm, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date of Birth</label><input type="date" style={inputStyle} value={onboardForm.dob} onChange={e => setOnboardForm({ ...onboardForm, dob: e.target.value })} /></div>
                  <div><label style={labelStyle}>Blood Group</label><input style={inputStyle} value={onboardForm.blood_group} onChange={e => setOnboardForm({ ...onboardForm, blood_group: e.target.value })} placeholder="e.g. B+" /></div>
                </div>
                <div><label style={labelStyle}>Residential Address</label><textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} value={onboardForm.address} onChange={e => setOnboardForm({ ...onboardForm, address: e.target.value })} /></div>

                {/* Job Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 0' }}>Job Configurations</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <select style={inputStyle} value={onboardForm.department_id} onChange={e => setOnboardForm({ ...onboardForm, department_id: e.target.value, designation_id: '' })}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <select style={inputStyle} value={onboardForm.designation_id} onChange={e => setOnboardForm({ ...onboardForm, designation_id: e.target.value })}>
                      <option value="">Select Designation</option>
                      {filteredOnboardDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date of Joining</label><input type="date" style={inputStyle} value={onboardForm.date_of_joining} onChange={e => setOnboardForm({ ...onboardForm, date_of_joining: e.target.value })} /></div>
                  <div>
                    <label style={labelStyle}>Employment Type</label>
                    <select style={inputStyle} value={onboardForm.employment_type} onChange={e => setOnboardForm({ ...onboardForm, employment_type: e.target.value })}>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                </div>

                {/* Bank Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 0' }}>Bank Account Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Bank Name</label><input style={inputStyle} value={onboardForm.bank_name} onChange={e => setOnboardForm({ ...onboardForm, bank_name: e.target.value })} /></div>
                  <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={onboardForm.account_number} onChange={e => setOnboardForm({ ...onboardForm, account_number: e.target.value })} /></div>
                  <div><label style={labelStyle}>IFSC Code</label><input style={inputStyle} value={onboardForm.ifsc_code} onChange={e => setOnboardForm({ ...onboardForm, ifsc_code: e.target.value })} /></div>
                  <div><label style={labelStyle}>PAN Number</label><input style={inputStyle} value={onboardForm.pan_number} onChange={e => setOnboardForm({ ...onboardForm, pan_number: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowOnboardModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary" style={{ background: 'var(--accent-cyan)', color: '#000', fontWeight: 700 }}>Confirm Hire & Onboard</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Recruitment;
