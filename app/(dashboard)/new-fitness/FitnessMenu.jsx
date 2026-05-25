import React, { useState } from 'react';
import FitnessDashboard from './FitnessDashboard';
import ExercisesTab from './ExercisesTab';
import PlansTab from './PlansTab';
import ChallengesTab from './ChallengesTab';
import './FitnessMenu.css';

const tabs = [
  { id: 'tc-fit-dash', label: '📊 Dashboard' },
  { id: 'tc-fit-ex', label: '🏋️ Exercises' },
  { id: 'tc-fit-plans', label: '📋 Plans' },
  { id: 'tc-fit-ch', label: '🏆 Challenges' },
  { id: 'tc-fit-usr', label: '👤 Fitness Users' },
  { id: 'tc-fit-tr', label: '👨‍🏫 Trainers' },
  { id: 'tc-fit-sched', label: '📅 Schedule' },
  { id: 'tc-fit-ai', label: '🤖 AI Studio' },
  { id: 'tc-fit-log', label: '📝 AI Log' },
  { id: 'tc-fit-outdoor', label: '🌳 Outdoor' },
  { id: 'tc-fit-health', label: '📱 Health Integrations' },
  { id: 'tc-fit-whatsapp', label: '💬 WhatsApp' },
];

export default function FitnessMenu() {
  const [activeTab, setActiveTab] = useState('tc-fit-dash');

  const openModal = (type) => {
    // TODO: wire to your global modal system
    alert(`Open modal: ${type}`);
  };

  return (
    <div id="page-fitness" className="page">
      <div className="ph">
        <div className="ph-l">
          <div className="ptitle">💪 Fitness</div>
          <div className="psub">Workout programs · AI Personal Trainer · Gym integration · FitCoins · Challenges</div>
        </div>
        <div className="ph-r">
          <button className="btn btn-s" onClick={() => alert('Export CSV')}>📥 Export</button>
          <button className="btn btn-s" onClick={() => openModal('Add Exercise')}>+ Exercise</button>
          <button className="btn btn-s" onClick={() => openModal('Add Route')}>+ Route</button>
          <button className="btn btn-p" onClick={() => openModal('Add Plan')}>+ New Plan</button>
        </div>
      </div>

      <div className="tabs" role="tablist" id="fit-tabs">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {activeTab === 'tc-fit-dash' && <FitnessDashboard onOpenModal={openModal} />}
      {activeTab === 'tc-fit-ex' && <ExercisesTab onOpenModal={openModal} />}
      {activeTab === 'tc-fit-plans' && <PlansTab onOpenModal={openModal} />}
      {activeTab === 'tc-fit-ch' && <ChallengesTab onOpenModal={openModal} />}
      {activeTab === 'tc-fit-usr' && (
        <div className="tc-placeholder">👤 Fitness Users table — implement via &lt;DataTable /&gt; component</div>
      )}
      {activeTab === 'tc-fit-tr' && (
        <div className="tc-placeholder">👨‍🏫 Trainers management — implement via &lt;DataTable /&gt; component</div>
      )}
      {activeTab === 'tc-fit-sched' && (
        <div className="tc-placeholder">📅 Schedule calendar — implement via &lt;ScheduleCalendar /&gt; component</div>
      )}
      {activeTab === 'tc-fit-ai' && (
        <div className="tc-placeholder">🤖 AI Studio — implement via &lt;AIStudioPanel /&gt; component</div>
      )}
      {activeTab === 'tc-fit-log' && (
        <div className="tc-placeholder">📝 AI Log — implement via &lt;ActivityLog /&gt; component</div>
      )}
      {activeTab === 'tc-fit-outdoor' && (
        <div className="tc-placeholder">🌳 Outdoor routes — implement via &lt;OutdoorMap /&gt; component</div>
      )}
      {activeTab === 'tc-fit-health' && (
        <div className="tc-placeholder">📱 Health Integrations — implement via &lt;HealthConnect /&gt; component</div>
      )}
      {activeTab === 'tc-fit-whatsapp' && (
        <div className="tc-placeholder">💬 WhatsApp integration — implement via &lt;WhatsAppPanel /&gt; component</div>
      )}
    </div>
  );
}
