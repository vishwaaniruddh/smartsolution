import { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Truck, Search, Play, RefreshCw, CheckCircle2, 
  MapPin, Clock, ShieldCheck, ArrowRightLeft
} from 'lucide-react';

const CourierTracker = () => {
  const { tenantId, toast } = useInventory();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [simulatingId, setSimulatingId] = useState(null);

  const fetchShipments = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/couriers?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShipments(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching shipments:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShipments();
  }, [tenantId]);

  const handleSimulateStatus = (courierId) => {
    setSimulatingId(courierId);
    fetch(`${apiBaseUrl}/inventory/couriers?action=simulate&tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: courierId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchShipments();
        } else {
          toast.error(data.error || "Simulation update failed.");
        }
      })
      .catch(err => console.error("Error simulating courier shipment:", err))
      .finally(() => setSimulatingId(null));
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'Dispatched': return 1;
      case 'In Transit': return 2;
      case 'Out for Delivery': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = 
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.origin && s.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.destination && s.destination.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Filters Toolbar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
          <div className="leads-search" style={{ margin: 0, minWidth: '240px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by tracking number, courier, origin..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <button 
          className="modal-btn secondary" 
          onClick={fetchShipments}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
        >
          <RefreshCw size={14} /> Refresh Shipments
        </button>
      </div>

      {/* Courier Tracker Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading shipment trackers...</div>
        ) : filteredShipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No courier shipments tracked currently. Generate purchase orders to trigger courier tracking automatically.
          </div>
        ) : filteredShipments.map((shipment) => {
          const currentStep = getStatusStep(shipment.status);
          const steps = ['Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'];
          
          return (
            <div 
              key={shipment.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {/* Card Header Info */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: 'var(--radius-md)', 
                    background: shipment.status === 'Delivered' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(34, 211, 238, 0.08)',
                    color: shipment.status === 'Delivered' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: shipment.status === 'Delivered' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(34, 211, 238, 0.2)',
                  }}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-white)', fontWeight: 700 }}>
                      {shipment.name || `Shipment Entry #${shipment.id}`}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      Carrier: <strong>{shipment.courier_name}</strong> | Tracking Number: <strong style={{ color: 'var(--accent-cyan)' }}>{shipment.tracking_number}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {shipment.purchase_order_id && (
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      PO ID: #PO-00{shipment.purchase_order_id}
                    </span>
                  )}
                  {shipment.status !== 'Delivered' && shipment.status !== 'Returned' && (
                    <button 
                      onClick={() => handleSimulateStatus(shipment.id)}
                      disabled={simulatingId === shipment.id}
                      className="add-lead-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        height: 'auto',
                        minHeight: 0,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(34, 211, 238, 0.2)',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={11} /> 
                      {simulatingId === shipment.id ? 'Simulating...' : 'Run Simulation Step'}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress stepped timeline graphic */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                position: 'relative', 
                padding: '12px 0 0 0',
                marginTop: '10px'
              }}>
                {/* Horizontal connector line */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '12.5%',
                  width: '75%',
                  height: '4px',
                  background: 'var(--border)',
                  zIndex: 1
                }} />
                
                {/* Active progress connector line */}
                {currentStep > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '12.5%',
                    width: `${((currentStep - 1) / 3) * 75}%`,
                    height: '4px',
                    background: 'var(--accent-cyan)',
                    zIndex: 2,
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                )}

                {/* Steps Nodes */}
                {steps.map((st, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = stepNum < currentStep;
                  const isActive = stepNum === currentStep;
                  
                  let nodeColor = 'var(--border)';
                  let nodeIconBg = 'var(--bg-card)';
                  let textColor = 'var(--text-muted)';
                  let fontWeight = 500;

                  if (isCompleted) {
                    nodeColor = 'var(--accent-cyan)';
                    nodeIconBg = 'var(--accent-cyan)';
                    textColor = 'var(--text-secondary)';
                  } else if (isActive) {
                    nodeColor = 'var(--accent-cyan)';
                    nodeIconBg = 'var(--bg-card)';
                    textColor = 'var(--text-white)';
                    fontWeight = 700;
                  }

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        zIndex: 3, 
                        textAlign: 'center',
                        position: 'relative' 
                      }}
                    >
                      {/* Circle node */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: nodeIconBg,
                        border: `4px solid ${nodeColor}`,
                        boxShadow: isActive ? '0 0 8px var(--accent-cyan)' : 'none',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isCompleted && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />
                        )}
                      </div>
                      
                      {/* Step Text */}
                      <span style={{ 
                        marginTop: '10px', 
                        fontSize: '11.5px', 
                        fontWeight: fontWeight, 
                        color: textColor 
                      }}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Courier origin & destination detail bar */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '13px',
                marginTop: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                  Origin: <strong style={{ color: 'var(--text-primary)' }}>{shipment.origin || 'Supplier Location'}</strong>
                </div>

                <div style={{ color: 'var(--text-muted)' }}><ArrowRightLeft size={14} /></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} style={{ color: 'var(--accent-cyan)' }} />
                  Destination: <strong style={{ color: 'var(--text-primary)' }}>{shipment.destination || 'Primary Warehouse'}</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default CourierTracker;
