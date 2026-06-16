import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, Calendar, AlertCircle } from 'lucide-react';
import { apiBaseUrl } from '../../../utils/env.js';
import { useCRM } from '../context/CRMContext';

const SATasks = () => {
  const { toast, activeAgent } = useCRM();
  const [tasks, setTasks] = useState([]);
  const [agentLeads, setAgentLeads] = useState([]);
  const [taskFilter, setTaskFilter] = useState('Pending');

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    due_date: '',
    lead_id: ''
  });
  const [savingTask, setSavingTask] = useState(false);

  // Fetch agent tasks
  const fetchTasks = useCallback(() => {
    fetch(`${apiBaseUrl}/tasks?agent_name=${encodeURIComponent(activeAgent)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setTasks(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error fetching tasks, using mock tasks:', err);
        const mockTasks = [
          { id: 1, title: 'Follow up on onboarding', due_date: '2026-06-14', status: 'Pending', agent_name: 'Emily Davis', lead_name: 'Acme Corp', lead_id: 1 },
          { id: 2, title: 'Send contract proposal', due_date: '2026-06-15', status: 'Pending', agent_name: 'Emily Davis', lead_name: 'TechFlow', lead_id: 2 },
          { id: 3, title: 'Review requirements doc', due_date: '2026-06-12', status: 'Completed', agent_name: 'Emily Davis', lead_name: 'Apex Org', lead_id: 3 },
          { id: 4, title: 'Cold call lead follow-up', due_date: '2026-06-10', status: 'Pending', agent_name: 'Emily Davis', lead_name: 'Acme Corp', lead_id: 1 }
        ];
        setTasks(mockTasks.filter(t => t.agent_name === activeAgent));
      });
  }, [activeAgent]);

  // Fetch leads assigned to agent to populate the "Link to Lead" dropdown
  const fetchAgentLeads = useCallback(() => {
    fetch(`${apiBaseUrl}/leads`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const filtered = data.data.filter(l => l.agent === activeAgent && l.delegation_status === 'Accepted');
          setAgentLeads(filtered);
        }
      })
      .catch(() => {
        const mockLeads = [
          { id: 1, name: 'Acme Corp', agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 2, name: 'TechFlow', agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 3, name: 'Apex Org', agent: 'Emily Davis', delegation_status: 'Accepted' },
        ];
        setAgentLeads(mockLeads.filter(l => l.agent === activeAgent));
      });
  }, [activeAgent]);

  useEffect(() => {
    fetchTasks();
    fetchAgentLeads();
  }, [fetchTasks, fetchAgentLeads]);

  // Toggle task completion status
  const handleToggleStatus = (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updatedData = {
      id: task.id,
      status: newStatus
    };

    fetch(`${apiBaseUrl}/tasks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
      }
    })
    .catch(() => {
      // Local fallback
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    });
  };

  // Submit new task
  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.due_date) {
      toast.warning('Please enter a task title and due date.');
      return;
    }

    setSavingTask(true);
    const taskData = {
      agent_name: activeAgent,
      title: newTask.title,
      due_date: newTask.due_date,
      lead_id: newTask.lead_id || null
    };

    fetch(`${apiBaseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
        setNewTask({ title: '', due_date: '', lead_id: '' });
      }
    })
    .catch(() => {
      // Local fallback
      const selectedLead = agentLeads.find(l => l.id === parseInt(newTask.lead_id));
      const localTask = {
        id: Date.now(),
        title: newTask.title,
        due_date: newTask.due_date,
        status: 'Pending',
        agent_name: activeAgent,
        lead_id: newTask.lead_id,
        lead_name: selectedLead ? selectedLead.name : ''
      };
      setTasks([localTask, ...tasks]);
      setNewTask({ title: '', due_date: '', lead_id: '' });
    })
    .finally(() => {
      setSavingTask(false);
    });
  };

  // Helper to check if task is overdue
  const isOverdue = (dueDate, status) => {
    if (status === 'Completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'All') return true;
    return t.status === taskFilter;
  });

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
      
      {/* TASK LIST */}
      <div>
        <div className="leads-page-header" style={{ marginBottom: '20px' }}>
          <div className="chart-toggle">
            <button 
              className={taskFilter === 'Pending' ? 'active' : ''} 
              onClick={() => setTaskFilter('Pending')}
            >
              Pending
            </button>
            <button 
              className={taskFilter === 'Completed' ? 'active' : ''} 
              onClick={() => setTaskFilter('Completed')}
            >
              Completed
            </button>
            <button 
              className={taskFilter === 'All' ? 'active' : ''} 
              onClick={() => setTaskFilter('All')}
            >
              All
            </button>
          </div>
        </div>

        <div className="leads-table-card">
          <h2>My Tasks & Reminders ({filteredTasks.length})</h2>
          
          <div style={{ padding: '8px 24px 24px' }}>
            {filteredTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task.due_date, task.status);
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => handleToggleStatus(task)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        padding: '16px', 
                        background: task.status === 'Completed' ? 'rgba(255,255,255,0.01)' : 'var(--bg-card)', 
                        border: overdue ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: task.status === 'Completed' ? 0.6 : 1
                      }}
                    >
                      {/* Custom Checkbox */}
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '4px', 
                        border: task.status === 'Completed' ? 'none' : '2px solid var(--border-light)', 
                        background: task.status === 'Completed' ? 'var(--accent-green)' : 'transparent',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {task.status === 'Completed' && <Check size={14} style={{ color: 'white' }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: task.status === 'Completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: task.status === 'Completed' ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {task.lead_name && (
                            <span>Lead: <strong style={{ color: 'var(--text-secondary)' }}>{task.lead_name}</strong></span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: overdue ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                            <Calendar size={12} /> {task.due_date} {overdue && '(Overdue)'}
                          </span>
                        </div>
                      </div>

                      {overdue && (
                        <AlertCircle size={18} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                No tasks to display in this view.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE TASK SIDE PANEL */}
      <div className="chart-card" style={{ height: 'fit-content' }}>
        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px', fontSize: '15px' }}>
          Schedule Follow-up
        </h3>
        
        <form onSubmit={handleTaskSubmit}>
          <div className="form-group">
            <label className="form-label">Task Action Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Call client to discuss draft"
              className="form-control"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Link to Lead</label>
            <select
              className="form-control"
              value={newTask.lead_id}
              onChange={(e) => setNewTask({ ...newTask, lead_id: e.target.value })}
            >
              <option value="">General (No Link)</option>
              {agentLeads.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={savingTask}
            className="modal-btn primary"
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center', padding: '10px' }}
          >
            <Plus size={16} /> Schedule Task
          </button>
        </form>
      </div>

    </div>
  );
};

export default SATasks;
