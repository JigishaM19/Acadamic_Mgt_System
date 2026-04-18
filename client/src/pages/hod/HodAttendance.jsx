import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
    FiTrendingUp, FiTrendingDown, FiUsers, FiBookOpen,
    FiAlertTriangle, FiCheckCircle, FiBarChart2, FiChevronDown,
    FiChevronUp, FiAward, FiTarget, FiActivity, FiPieChart
} from 'react-icons/fi';

const HodAttendance = () => {
    const [data, setData] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: '', classId: '' });
    const [expandedClass, setExpandedClass] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [filters]);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/hod/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.year) params.append('year', filters.year);
            if (filters.classId) params.append('classId', filters.classId);

            const response = await api.get(`/hod/attendance/analytics?${params}`);
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (pct) => {
        if (pct >= 90) return '#22c55e';
        if (pct >= 75) return '#22c55e';
        if (pct >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getStatusBg = (pct) => {
        if (pct >= 90) return 'rgba(34,197,94,0.1)';
        if (pct >= 75) return 'rgba(34,197,94,0.08)';
        if (pct >= 60) return 'rgba(245,158,11,0.1)';
        return 'rgba(239,68,68,0.1)';
    };

    const getStatusLabel = (pct) => {
        if (pct >= 90) return 'Excellent';
        if (pct >= 75) return 'Good';
        if (pct >= 60) return 'Warning';
        return 'Critical';
    };

    const filteredClasses = useMemo(() => {
        if (!filters.year) return classes;
        return classes.filter(c => c.year === parseInt(filters.year));
    }, [classes, filters.year]);

    // Distribution chart component
    const DistributionChart = ({ distribution }) => {
        const total = distribution.above90 + distribution.above75 + distribution.above60 + distribution.below60;
        if (total === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)' }}>No data</div>;

        const segments = [
            { label: '90%+', count: distribution.above90, color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)' },
            { label: '75-89%', count: distribution.above75, color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)' },
            { label: '60-74%', count: distribution.above60, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
            { label: '<60%', count: distribution.below60, color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Stacked bar */}
                <div style={{
                    display: 'flex', height: '28px', borderRadius: '14px', overflow: 'hidden',
                    background: 'var(--gray-100)'
                }}>
                    {segments.map((seg, i) => {
                        const pct = (seg.count / total) * 100;
                        if (pct === 0) return null;
                        return (
                            <div key={i} title={`${seg.label}: ${seg.count} students (${Math.round(pct)}%)`} style={{
                                width: `${pct}%`, background: seg.color, transition: 'width 0.6s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: '700', color: '#fff',
                                minWidth: pct > 5 ? 'auto' : '0'
                            }}>
                                {pct >= 10 ? `${Math.round(pct)}%` : ''}
                            </div>
                        );
                    })}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {segments.map((seg, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', flex: '1',
                            padding: '10px 14px', borderRadius: '10px', background: seg.bgColor,
                            minWidth: '120px'
                        }}>
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: seg.color, flexShrink: 0
                            }} />
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: seg.color }}>{seg.count}</div>
                                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{seg.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Trend mini chart
    const TrendChart = ({ trend }) => {
        const maxPct = Math.max(...trend.map(t => t.percentage), 1);
        const trendDirection = trend.length >= 2
            ? trend[trend.length - 1].percentage - trend[trend.length - 2].percentage
            : 0;

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                    {trendDirection > 0 ? (
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                            <FiTrendingUp size={16} /> +{trendDirection}% from last week
                        </span>
                    ) : trendDirection < 0 ? (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                            <FiTrendingDown size={16} /> {trendDirection}% from last week
                        </span>
                    ) : (
                        <span style={{ color: 'var(--gray-500)', fontSize: '13px', fontWeight: '500' }}>No change</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '120px' }}>
                    {trend.map((t, i) => (
                        <div key={i} style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: getStatusColor(t.percentage) }}>
                                {t.percentage}%
                            </span>
                            <div style={{
                                width: '100%', maxWidth: '56px',
                                height: `${Math.max((t.percentage / maxPct) * 80, 8)}%`,
                                borderRadius: '8px 8px 4px 4px',
                                background: `linear-gradient(180deg, ${getStatusColor(t.percentage)}cc, ${getStatusColor(t.percentage)}55)`,
                                transition: 'height 0.5s ease',
                                minHeight: '8px'
                            }} />
                            <span style={{
                                fontSize: '10px', color: 'var(--gray-500)',
                                textAlign: 'center', lineHeight: '1.2'
                            }}>
                                {t.weekLabel}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Circular progress ring
    const CircularProgress = ({ percentage, size = 100, strokeWidth = 8 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;
        const color = getStatusColor(percentage);

        return (
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="var(--gray-100)" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <FiBarChart2 size={48} style={{ marginBottom: '12px' }} />
                <h3>Unable to load attendance analytics</h3>
            </div>
        );
    }

    const { summary, classAnalytics, distribution, weeklyTrend, subjectStats, bottomStudents, topStudents } = data;

    return (
        <div>
            {/* Filters */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <FiBarChart2 size={20} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--gray-800)' }}>
                        Attendance Analytics
                    </h2>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ year: e.target.value, classId: '' })}
                            style={{ minWidth: '130px' }}
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                        <select
                            value={filters.classId}
                            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                            style={{ minWidth: '160px' }}
                        >
                            <option value="">All Classes</option>
                            {filteredClasses.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px', marginBottom: '20px'
            }}>
                {/* Department Average */}
                <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.06 }}>
                        <FiTarget size={100} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <FiTarget size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Dept Average
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '800', color: getStatusColor(summary.deptAvgAttendance) }}>
                            {summary.deptAvgAttendance}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: getStatusColor(summary.deptAvgAttendance) }}>%</span>
                    </div>
                    <div style={{
                        marginTop: '6px', padding: '3px 10px', borderRadius: '12px',
                        background: getStatusBg(summary.deptAvgAttendance),
                        color: getStatusColor(summary.deptAvgAttendance),
                        fontSize: '11px', fontWeight: '600', display: 'inline-block'
                    }}>
                        {getStatusLabel(summary.deptAvgAttendance)}
                    </div>
                </div>

                {/* Total Students */}
                <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.06 }}>
                        <FiUsers size={100} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <FiUsers size={16} style={{ color: '#3b82f6' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Students
                        </span>
                    </div>
                    <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--gray-800)' }}>
                        {summary.totalStudents}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        across {summary.totalClasses} class{summary.totalClasses !== 1 ? 'es' : ''}
                    </div>
                </div>

                {/* Total Lectures */}
                <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.06 }}>
                        <FiBookOpen size={100} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <FiBookOpen size={16} style={{ color: '#8b5cf6' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Lectures (30d)
                        </span>
                    </div>
                    <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--gray-800)' }}>
                        {summary.totalLectures}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        recorded sessions
                    </div>
                </div>

                {/* At Risk */}
                <div className="card" style={{
                    padding: '20px', position: 'relative', overflow: 'hidden',
                    borderLeft: summary.atRiskCount > 0 ? '4px solid #ef4444' : '4px solid #22c55e'
                }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.06 }}>
                        <FiAlertTriangle size={100} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <FiAlertTriangle size={16} style={{ color: summary.atRiskCount > 0 ? '#ef4444' : '#22c55e' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            At Risk (&lt;{summary.minAttendanceThreshold}%)
                        </span>
                    </div>
                    <span style={{ fontSize: '32px', fontWeight: '800', color: summary.atRiskCount > 0 ? '#ef4444' : '#22c55e' }}>
                        {summary.atRiskCount}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        {summary.atRiskCount > 0 ? 'need attention' : 'all students safe'}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--white)',
                padding: '4px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)'
            }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <FiActivity size={15} /> },
                    { id: 'classes', label: 'Class Analysis', icon: <FiBarChart2 size={15} /> },
                    { id: 'students', label: 'Students', icon: <FiUsers size={15} /> },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none',
                        cursor: 'pointer', transition: 'all 0.25s ease', fontWeight: '600',
                        fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '6px',
                        background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                        color: activeTab === tab.id ? '#fff' : 'var(--gray-500)',
                    }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === 'overview' && (
                <>
                    {/* Trend + Distribution Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Weekly Trend */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <FiActivity size={18} style={{ color: 'var(--primary)' }} />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                    Weekly Trend
                                </h3>
                            </div>
                            {weeklyTrend && weeklyTrend.length > 0 ? (
                                <TrendChart trend={weeklyTrend} />
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-400)' }}>No trend data</div>
                            )}
                        </div>

                        {/* Distribution */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <FiPieChart size={18} style={{ color: '#8b5cf6' }} />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                    Student Distribution
                                </h3>
                            </div>
                            <DistributionChart distribution={distribution} />
                        </div>
                    </div>

                    {/* Subject-wise Heatmap */}
                    {subjectStats && subjectStats.length > 0 && (
                        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <FiBookOpen size={18} style={{ color: '#3b82f6' }} />
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                    Subject-wise Attendance
                                </h3>
                                <span style={{
                                    fontSize: '11px', fontWeight: '500', padding: '3px 10px',
                                    borderRadius: '8px', background: 'var(--gray-100)', color: 'var(--gray-500)',
                                    marginLeft: 'auto'
                                }}>
                                    Last 30 days
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                {subjectStats.map((subj, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '14px 16px', borderRadius: '10px',
                                        background: 'var(--gray-50)', border: '1px solid var(--gray-100)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {subj.subject}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                                                {subj.lectureCount} lecture{subj.lectureCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        {/* Mini progress bar */}
                                        <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: 'var(--gray-200)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: '3px',
                                                width: `${subj.avgAttendance}%`,
                                                background: getStatusColor(subj.avgAttendance),
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                        <span style={{
                                            fontSize: '14px', fontWeight: '700',
                                            color: getStatusColor(subj.avgAttendance),
                                            minWidth: '40px', textAlign: 'right'
                                        }}>
                                            {subj.avgAttendance}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ===== CLASS ANALYSIS TAB ===== */}
            {activeTab === 'classes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {classAnalytics.length === 0 ? (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                            <FiBarChart2 size={40} style={{ marginBottom: '12px' }} />
                            <h3 style={{ margin: 0 }}>No class data available</h3>
                        </div>
                    ) : (
                        classAnalytics.map((cls) => {
                            const isExpanded = expandedClass === cls.classId;
                            return (
                                <div key={cls.classId} className="card" style={{
                                    overflow: 'hidden',
                                    borderLeft: `4px solid ${getStatusColor(cls.avgAttendance)}`
                                }}>
                                    {/* Class Header */}
                                    <div
                                        onClick={() => setExpandedClass(isExpanded ? null : cls.classId)}
                                        style={{
                                            padding: '18px 22px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            transition: 'background 0.15s ease'
                                        }}
                                    >
                                        {/* Circle progress */}
                                        <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                                            <CircularProgress percentage={cls.avgAttendance} size={56} strokeWidth={5} />
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%',
                                                transform: 'translate(-50%, -50%) rotate(0deg)',
                                                fontSize: '13px', fontWeight: '800',
                                                color: getStatusColor(cls.avgAttendance)
                                            }}>
                                                {cls.avgAttendance}%
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                                    {cls.className}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: '600', padding: '2px 10px',
                                                    borderRadius: '8px', background: 'rgba(99,102,241,0.1)',
                                                    color: 'var(--primary)'
                                                }}>
                                                    Year {cls.year}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: '600', padding: '2px 10px',
                                                    borderRadius: '8px',
                                                    background: getStatusBg(cls.avgAttendance),
                                                    color: getStatusColor(cls.avgAttendance)
                                                }}>
                                                    {getStatusLabel(cls.avgAttendance)}
                                                </span>
                                            </div>
                                            <div style={{
                                                display: 'flex', gap: '16px', marginTop: '6px',
                                                fontSize: '12px', color: 'var(--gray-500)'
                                            }}>
                                                <span><FiUsers size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{cls.totalStudents} students</span>
                                                <span><FiBookOpen size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{cls.totalLectures} lectures</span>
                                            </div>
                                        </div>

                                        <div style={{ color: 'var(--gray-400)' }}>
                                            {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                                        </div>
                                    </div>

                                    {/* Expanded: Subject Breakdown */}
                                    {isExpanded && cls.subjectBreakdown && cls.subjectBreakdown.length > 0 && (
                                        <div style={{
                                            padding: '0 22px 20px',
                                            borderTop: '1px solid var(--gray-100)',
                                            background: 'var(--gray-50)'
                                        }}>
                                            <div style={{
                                                padding: '14px 0 10px',
                                                fontSize: '13px', fontWeight: '600', color: 'var(--gray-600)'
                                            }}>
                                                Subject Breakdown
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {cls.subjectBreakdown.map((subj, j) => (
                                                    <div key={j} style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '10px 14px', borderRadius: '8px',
                                                        background: 'var(--white)', border: '1px solid var(--gray-100)'
                                                    }}>
                                                        <div style={{
                                                            width: '8px', height: '8px', borderRadius: '50%',
                                                            background: getStatusColor(subj.avgAttendance), flexShrink: 0
                                                        }} />
                                                        <span style={{
                                                            flex: 1, fontSize: '13px', fontWeight: '500',
                                                            color: 'var(--gray-700)',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                        }}>
                                                            {subj.subject}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '11px', color: 'var(--gray-400)', whiteSpace: 'nowrap'
                                                        }}>
                                                            {subj.lectureCount} lec
                                                        </span>
                                                        <div style={{ width: '100px', height: '6px', borderRadius: '3px', background: 'var(--gray-200)', overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%', borderRadius: '3px',
                                                                width: `${subj.avgAttendance}%`,
                                                                background: getStatusColor(subj.avgAttendance),
                                                                transition: 'width 0.4s ease'
                                                            }} />
                                                        </div>
                                                        <span style={{
                                                            fontSize: '13px', fontWeight: '700',
                                                            color: getStatusColor(subj.avgAttendance),
                                                            minWidth: '38px', textAlign: 'right'
                                                        }}>
                                                            {subj.avgAttendance}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isExpanded && (!cls.subjectBreakdown || cls.subjectBreakdown.length === 0) && (
                                        <div style={{
                                            padding: '20px 22px', textAlign: 'center',
                                            color: 'var(--gray-400)', fontSize: '13px',
                                            borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)'
                                        }}>
                                            No subject-level data available
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ===== STUDENTS TAB ===== */}
            {activeTab === 'students' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {/* Bottom Performers */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{
                            padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))',
                            borderBottom: '1px solid var(--gray-100)'
                        }}>
                            <FiAlertTriangle size={18} style={{ color: '#ef4444' }} />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                Lowest Attendance
                            </h3>
                            <span style={{
                                fontSize: '11px', fontWeight: '600', padding: '2px 10px',
                                borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                marginLeft: 'auto'
                            }}>
                                Bottom 10
                            </span>
                        </div>
                        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            {bottomStudents && bottomStudents.length > 0 ? (
                                bottomStudents.map((s, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 22px',
                                        borderBottom: '1px solid var(--gray-50)',
                                        transition: 'background 0.15s ease'
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: i < 3 ? 'rgba(239,68,68,0.1)' : 'var(--gray-100)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: '700',
                                            color: i < 3 ? '#ef4444' : 'var(--gray-500)',
                                            flexShrink: 0
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {s.fullName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                                                {s.className} • Roll {s.rollNo || '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '14px', fontWeight: '700',
                                                color: getStatusColor(s.attendancePercent)
                                            }}>
                                                {s.attendancePercent}%
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--gray-400)' }}>
                                                {s.attended}/{s.totalLectures}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '13px' }}>
                                    <FiCheckCircle size={24} style={{ marginBottom: '8px' }} />
                                    <div>No students to show</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{
                            padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))',
                            borderBottom: '1px solid var(--gray-100)'
                        }}>
                            <FiAward size={18} style={{ color: '#22c55e' }} />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--gray-800)' }}>
                                Top Attendance
                            </h3>
                            <span style={{
                                fontSize: '11px', fontWeight: '600', padding: '2px 10px',
                                borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                marginLeft: 'auto'
                            }}>
                                Top 5
                            </span>
                        </div>
                        <div>
                            {topStudents && topStudents.length > 0 ? (
                                topStudents.map((s, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 22px',
                                        borderBottom: '1px solid var(--gray-50)',
                                        transition: 'background 0.15s ease'
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: i === 0 ? 'rgba(34,197,94,0.15)' : 'var(--gray-100)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: '700',
                                            color: i === 0 ? '#22c55e' : 'var(--gray-500)',
                                            flexShrink: 0
                                        }}>
                                            {i === 0 ? '🏆' : i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {s.fullName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                                                {s.className} • Roll {s.rollNo || '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '14px', fontWeight: '700',
                                                color: getStatusColor(s.attendancePercent)
                                            }}>
                                                {s.attendancePercent}%
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--gray-400)' }}>
                                                {s.attended}/{s.totalLectures}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '13px' }}>
                                    <FiCheckCircle size={24} style={{ marginBottom: '8px' }} />
                                    <div>No students to show</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HodAttendance;
