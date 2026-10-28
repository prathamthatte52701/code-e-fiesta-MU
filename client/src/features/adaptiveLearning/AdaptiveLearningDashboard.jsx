import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Brain, CheckCircle, Code2, Target, TrendingUp, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import useGaps from '../../hooks/useGaps';
import { LANGUAGES, normalizeLanguage } from '../../utils/i18n';
import { simulatedLearners } from './simulatedLearners';
import {
  buildAnalyticsSummary,
  buildLearnerDNA,
} from './adaptiveLearningEngine';

const StatCard = ({ icon, label, value, helper, color }) => {
  const { colors } = useTheme();
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      padding: 16,
      minHeight: 104,
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
        <span style={{ color, display: 'inline-flex' }}>{icon}</span>
      </div>
      <div style={{ color: colors.text, fontSize: 26, fontWeight: 800, marginTop: 10 }}>{value}</div>
      {helper && <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{helper}</div>}
    </div>
  );
};

const ProgressBar = ({ value, color }) => {
  const { colors } = useTheme();
  return (
    <div style={{ width: '100%', height: 8, borderRadius: 999, background: colors.border, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  );
};

const bandColor = (score, colors) => {
  if (score === null || score === undefined) return colors.textMuted;
  if (score < 40) return colors.error;
  if (score < 60) return colors.warning;
  return colors.success;
};

function GapsSection({ gaps }) {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = gaps;
  const box = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 };
  const tag = { color: colors.textMuted, background: `${colors.textMuted}18`, borderRadius: 999, padding: '2px 8px', fontSize: 11, marginLeft: 8 };

  let body;
  if (loading && !data) {
    body = <div style={{ color: colors.textMuted, fontSize: 14 }}>Loading your gaps...</div>;
  } else if (error && !data) {
    body = (
      <div style={{ color: colors.error, fontSize: 14 }}>
        {error}{' '}
        <button onClick={refetch} style={{ marginLeft: 8, background: colors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  } else if (data) {
    const nameOf = (id) => data.topicMastery.find(t => t.topicId === id)?.name || id;
    const rec = data.recommendation;
    const hasData = data.topicMastery.some(t => t.score !== null);
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rec && (
          <div style={{ padding: 14, borderRadius: 12, background: `${colors.accent}12`, border: `1px solid ${colors.accent}40` }}>
            <div style={{ color: colors.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Recommended: {rec.type.replace('-', ' ')}</div>
            <p style={{ color: colors.text, fontSize: 14, margin: '6px 0 10px', lineHeight: 1.6 }}>{rec.reason}</p>
            {rec.topicId && (
              <button onClick={() => navigate(`/topic/${rec.topicId}`)} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Go to {nameOf(rec.topicId)}
              </button>
            )}
          </div>
        )}

        {!hasData && <div style={{ color: colors.textMuted, fontSize: 14 }}>Answer a few questions to see your gaps</div>}

        {data.rootCauses.length > 0 && (
          <div style={{ padding: 14, borderRadius: 12, background: `${colors.warning}12`, border: `1px solid ${colors.warning}55` }}>
            <h3 style={{ color: colors.text, margin: '0 0 8px', fontSize: 15 }}>Root cause</h3>
            {data.rootCauses.map(rc => {
              const names = rc.explains.map(nameOf);
              return (
                <div key={rc.topicId} style={{ marginBottom: 6 }}>
                  <div style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>{rc.path.map(nameOf).join(' -> ')}</div>
                  <div style={{ color: colors.textMuted, fontSize: 13 }}>{names.join(' and ')} {names.length > 1 ? 'are' : 'is'} weak because {rc.name} is weak.</div>
                </div>
              );
            })}
          </div>
        )}

        {hasData && (
          <div>
            <h3 style={{ color: colors.text, margin: '0 0 10px', fontSize: 15 }}>Topic mastery</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.topicMastery.map(t => (
                <div key={t.topicId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: colors.text, marginBottom: 4 }}>
                    <span>
                      {t.name}
                      {t.score === null && <span style={tag}>No data yet</span>}
                      {t.score !== null && t.confidence === 'low' && <span style={tag}>low confidence</span>}
                    </span>
                    <span style={{ color: bandColor(t.score, colors) }}>{t.score === null ? '-' : `${t.score}% - ${t.band}`}</span>
                  </div>
                  <ProgressBar value={t.score ?? 0} color={bandColor(t.score, colors)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {data.weakConcepts.length > 0 && (
          <div>
            <h3 style={{ color: colors.text, margin: '0 0 10px', fontSize: 15 }}>Weak concepts</h3>
            {data.weakConcepts.map(c => (
              <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: colors.text, padding: '6px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span>{c.label} <span style={{ color: colors.textMuted }}>({nameOf(c.topicId)})</span></span>
                <span style={{ color: bandColor(c.score, colors) }}>{c.score}% - {c.attempts} tries</span>
              </div>
            ))}
          </div>
        )}

        {data.coverage?.specificShare != null && (
          <div style={{ color: colors.textMuted, fontSize: 11 }}>
            Tagging coverage: {Math.round(data.coverage.specificShare * 100)}% of answers matched a specific concept
          </div>
        )}
      </div>
    );
  }

  return (
    <section style={box}>
      <h2 style={{ color: colors.text, margin: '0 0 12px', fontSize: 18 }}>Your Learning Gaps</h2>
      {body}
    </section>
  );
}

const statusColor = (status, colors) => {
  if (status === 'Promoted' || status === 'Ready to Progress') return colors.success;
  if (status === 'Prerequisite Support') return colors.warning;
  if (status === 'Revision Required') return colors.error;
  return colors.accent;
};

const displayLanguage = (language) => LANGUAGES[normalizeLanguage(language)]?.label || 'English';

export default function AdaptiveLearningDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const realUser = !!user && !user.isGuest;
  const gapsState = useGaps();
  const gaps = gapsState.data;
  const profiles = useMemo(() => buildLearnerDNA(simulatedLearners), []);
  const simulatedProfiles = profiles.filter(profile => profile.validationType === 'simulated');
  const summary = useMemo(() => buildAnalyticsSummary(simulatedProfiles), [simulatedProfiles]);
  const [selectedId, setSelectedId] = useState(profiles[0]?.learnerId);
  const selected = profiles.find(profile => profile.learnerId === selectedId) || profiles[0];
  const learnerDna = {
    name: user?.name || selected?.name || 'Learner',
    profileType: user?.isDeveloper ? 'Development Mode' : 'Logged-in Learner',
    preferredLanguage: displayLanguage(user?.language || selected?.preferredLanguage),
    hobby: user?.hobby || selected?.preferredHobby || 'Not set',
    weakConcepts: realUser ? (gaps?.weakConcepts || []).map(c => c.label) : ['Variables'],
    codingMistakes: realUser ? ['Not tracked yet'] : ['Logic error'],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={{
        background: `linear-gradient(135deg, ${colors.accent}22, ${colors.surface})`,
        border: `1px solid ${colors.accent}55`,
        borderRadius: 18,
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: colors.accent,
          }}>
            <Brain size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: colors.text, margin: 0, fontSize: 28, lineHeight: 1.2 }}>Adaptive Learning Intelligence</h1>
            <p style={{ color: colors.textMuted, margin: '6px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              Uses the existing 60% adaptive gate, learner behavior, coding mistakes, platform performance, and topic dependencies to recommend the next best learning path.
            </p>
          </div>
        </div>
      </section>

      {realUser && <GapsSection gaps={gapsState} />}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ color: colors.text, margin: 0, fontSize: 18 }}>Simulated validation cohort (demo data)</h2>
          <span style={{
            color: colors.warning,
            background: `${colors.warning}18`,
            border: `1px solid ${colors.warning}55`,
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
          }}>
            Learners Profile
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}>
          <StatCard icon={<Activity size={18} />} label="Learners" value={summary.totalLearners} helper="Adaptive learner profiles" color={colors.accent} />
          <StatCard icon={<TrendingUp size={18} />} label="Score Before" value={`${summary.averageScoreBefore}%`} helper={`After: ${summary.averageScoreAfter}%`} color={colors.success} />
          <StatCard icon={<Zap size={18} />} label="Score Gain" value={`+${summary.averageScoreImprovement}%`} helper="Measured learning lift" color={colors.gold} />
          <StatCard icon={<Brain size={18} />} label="Mastery Gain" value={`+${summary.averageMasteryGain}%`} helper="Expected mastery gain" color={colors.accent} />
          <StatCard icon={<Target size={18} />} label="Promoted" value={summary.learnersPromoted} helper={`${summary.learnersAssignedRevision} assigned revision`} color={colors.success} />
          <StatCard icon={<Code2 size={18} />} label="Top Mistake" value={summary.mostCommonCodingMistake} helper={`Weak concept: ${summary.mostCommonWeakConcept}`} color={colors.error} />
        </div>
      </section>

      <section style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ color: colors.text, margin: 0, fontSize: 18 }}>Learner Recommendation Matrix</h2>
            <p style={{ color: colors.textMuted, margin: '4px 0 0', fontSize: 12 }}>Click a learner to inspect Learner DNA and mentor feedback.</p>
          </div>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>60% rule preserved as core progression gate</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ color: colors.textMuted, fontSize: 12, textAlign: 'left' }}>
                {['Learner', 'Language', 'Topic', 'Score', 'Mastery', 'Speed', 'Mistake', 'Difficulty', 'Next Module', 'Practice', 'Status'].map(label => (
                  <th key={label} style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => {
                const active = profile.learnerId === selected?.learnerId;
                const color = statusColor(profile.progressStatus, colors);
                return (
                  <tr
                    key={profile.learnerId}
                    onClick={() => setSelectedId(profile.learnerId)}
                    style={{
                      cursor: 'pointer',
                      background: active ? `${colors.accent}14` : 'transparent',
                      color: colors.text,
                      fontSize: 13,
                    }}
                  >
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700 }}>{profile.name}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{displayLanguage(profile.preferredLanguage)}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.currentTopic}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.quizScore}%</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}`, minWidth: 120 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span>{profile.mastery}%</span>
                        <ProgressBar value={profile.mastery} color={color} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.learningSpeed}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.mistakeProfile.primary}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.difficultyChange}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.recommendedNextModule}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>{profile.personalizedPracticeChallenge.challengeTitle}</td>
                    <td style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>
                      <span style={{ color, fontWeight: 800 }}>{profile.progressStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
          gap: 16,
        }} className="ali-insight-grid">
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
          }}>
            <h2 style={{ color: colors.text, margin: '0 0 12px', fontSize: 18 }}>Learner DNA - {learnerDna.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                ['Name', learnerDna.name],
                ['Profile Type', learnerDna.profileType],
                ['Preferred Language', learnerDna.preferredLanguage],
                ['Hobby', learnerDna.hobby],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                  <div style={{ color: colors.text, fontWeight: 700, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <InfoBlock title="Weak Concepts" items={learnerDna.weakConcepts} />
              <InfoBlock title="Coding Mistakes" items={learnerDna.codingMistakes} />
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: `${colors.accent}12`, border: `1px solid ${colors.accent}40` }}>
              <h3 style={{ color: colors.text, margin: '0 0 8px', fontSize: 15 }}>AI Mentor Feedback</h3>
              <p style={{ color: colors.textMuted, margin: 0, lineHeight: 1.7, fontSize: 13 }}>{selected.mentorFeedback}</p>
            </div>
          </div>

          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
          }}>
            <h2 style={{ color: colors.text, margin: '0 0 12px', fontSize: 18 }}>Today's Mission</h2>
            <div style={{ color: colors.text, fontSize: 15, lineHeight: 1.6, fontWeight: 700 }}>{selected.todayMission}</div>

            <div style={{ marginTop: 16 }}>
              <h3 style={{ color: colors.text, fontSize: 15, margin: '0 0 8px' }}>Personalized Practice</h3>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
                <div style={{ color: colors.accent, fontWeight: 800 }}>{selected.personalizedPracticeChallenge.challengeTitle}</div>
                <p style={{ color: colors.textMuted, margin: '8px 0', fontSize: 13, lineHeight: 1.6 }}>{selected.personalizedPracticeChallenge.taskDescription}</p>
                <div style={{ color: colors.text, fontSize: 12 }}>Difficulty: {selected.personalizedPracticeChallenge.difficulty}</div>
                <div style={{ color: colors.text, fontSize: 12 }}>Mistake Focus: {selected.personalizedPracticeChallenge.mistakeFocus}</div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 style={{ color: colors.text, fontSize: 15, margin: '0 0 8px' }}>Explainable Recommendation</h3>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: 13, lineHeight: 1.7 }}>{selected.recommendationReason}</p>
            </div>
          </div>
        </section>
      )}

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <StatCard icon={<CheckCircle size={18} />} label="Architecture" value="Additive" helper="No quiz, auth, boss, daily, or Monaco rewrite" color={colors.success} />
        <StatCard icon={<Target size={18} />} label="AI Adaptive" value="AI Adaptive Progressive Rule" helper="AI Adaptive" color={colors.gold} />
        <StatCard icon={<Brain size={18} />} label="Intelligence" value="Multi-signal" helper="Score, mastery, mistakes, speed, engagement, platform signals" color={colors.accent} />
      </section>
    </div>
  );
}

function InfoBlock({ title, items = [] }) {
  const { colors } = useTheme();
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
      <h3 style={{ color: colors.text, margin: '0 0 8px', fontSize: 14 }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(items.length ? items : ['No signal yet']).map((item, index) => (
          <span key={`${item}-${index}`} style={{
            color: colors.text,
            background: `${colors.accent}12`,
            border: `1px solid ${colors.accent}35`,
            borderRadius: 999,
            padding: '5px 8px',
            fontSize: 12,
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
