import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, ShieldAlert, Heart, Calendar, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth as authApi } from '@/services/api';

export default function MedicalDossier() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await authApi.getUserById(userId);
        if (res.data.success) {
          setPatient(res.data.user);
        } else {
          toast.error('Failed to load patient dossier.');
        }
      } catch (err) {
        console.error('Error fetching user dossier:', err);
        toast.error('Unable to fetch patient record from database.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [userId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
        background: '#090b11', color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="animate-spin" style={{
            width: 32, height: 32, border: '4px solid rgba(220,38,38,0.2)',
            borderTopColor: '#dc2626', borderRadius: '50%'
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Accessing Medical Vault...</span>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh',
        background: '#090b11', color: '#f8fafc', padding: 24, textAlign: 'center'
      }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Dossier Access Error</h2>
        <p style={{ color: '#94a3b8', maxWidth: 400, marginBottom: 20 }}>
          The requested user record could not be found or you do not have permission to view it.
        </p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { healthProfile = {} } = patient;
  const contacts = healthProfile.emergencyContacts || [];
  const timeline = healthProfile.timeline || [];

  return (
    <div className="page-content" style={{
      background: '#090b11', minHeight: '100vh', padding: '24px 32px', color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 38, height: 38, borderRadius: 8, background: '#121420',
            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase' }}>
            SECURED EMERGENCY RECORD
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            Medical Dossier: {patient.name}
          </h2>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Dossier Details & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Core Health Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={16} /> Patient Health Summary
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Blood Group</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f43f5e', marginTop: 3 }}>
                    {healthProfile.bloodGroup || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Allergies</span>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, marginTop: 3 }}>
                    {healthProfile.allergies?.length > 0 
                      ? healthProfile.allergies.join(', ') 
                      : 'None Reported'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Medications</span>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, marginTop: 3 }}>
                    {healthProfile.medications?.length > 0 
                      ? healthProfile.medications.join(', ') 
                      : 'None'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Chronic Conditions</span>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, marginTop: 3 }}>
                    {healthProfile.chronicConditions || 'None Declared'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Preferred Hospital</span>
                  <div style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600, marginTop: 3 }}>
                    {healthProfile.preferredHospital?.name || 'Any (Nearest Available)'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Residential Address</span>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 3 }}>
                    {healthProfile.residentialAddress || 'Not Provided'}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Timeline / Case Notes Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} /> Medical Timeline & Logs
            </h3>

            {timeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                <FileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>No historical logs recorded for this patient.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                {timeline.map((log: any, idx: number) => (
                  <div key={idx} style={{
                    display: 'flex', gap: 14, borderLeft: '2px solid rgba(239,68,68,0.2)',
                    paddingLeft: 16, position: 'relative', paddingBottom: idx === timeline.length - 1 ? 0 : 12
                  }}>
                    {/* Circle Node */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
                      position: 'absolute', left: -6, top: 4, border: '2px solid #121420'
                    }} />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{log.category}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>
                        {log.notes}
                      </p>
                      {log.attachmentUrl && (
                        <a
                          href={log.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                            color: '#38bdf8', textDecoration: 'none', marginTop: 6, fontWeight: 600
                          }}
                        >
                          <FileText size={12} /> View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>

        {/* Right Column: Profile details & Emergency contacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Patient Details Card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#dc2626',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, marginBottom: 12
              }}>
                {patient.name?.charAt(0).toUpperCase()}
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>{patient.name}</h4>
              <span style={{
                background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 10,
                fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginTop: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                {patient.role}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={14} color="#64748b" />
                <span style={{ fontSize: 12, color: '#cbd5e1', wordBreak: 'break-all' }}>{patient.email}</span>
              </div>
              {patient.healthProfile?.primaryPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Phone size={14} color="#64748b" />
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>{patient.healthProfile.primaryPhone}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={14} color="#64748b" />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Registered: {new Date(patient.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Emergency Contacts Card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> Emergency Contacts
            </h3>

            {contacts.length === 0 ? (
              <div style={{ textTransform: 'none', color: '#64748b', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                No emergency contacts declared.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contacts.map((contact: any, index: number) => (
                  <div key={index} style={{
                    padding: 10, background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
                    display: 'flex', flexDirection: 'column', gap: 2
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{contact.name}</span>
                      <span style={{
                        fontSize: 9, color: '#38bdf8', background: 'rgba(56,189,248,0.1)',
                        padding: '1px 5px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase'
                      }}>{contact.relation}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Phone size={10} /> {contact.phone}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>

      </div>
    </div>
  );
}
