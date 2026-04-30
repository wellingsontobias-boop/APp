import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Action, Prize, User, Role, Status, LoggedAction, Redemption, HistoryEntry, AppNotification, AdminSettings, Medal, Mission, UserMissionProgress, UserMissionProgressStatus, MissionType, MissionGoalType, MissionGoal, SpecialEvent, SpecialEventType } from './types';
import { USERS, ACTIONS, PRIZES, LOGGED_ACTIONS, REDEMPTIONS, NOTIFICATIONS, INITIAL_ADMIN_SETTINGS, MEDAL_TIERS, MISSIONS, USER_MISSION_PROGRESS, SPECIAL_EVENTS } from './constants';
import { HomeIcon, CheckCircleIcon, GiftIcon, ChartBarIcon, CogIcon, LogoutIcon, StarIcon, PencilIcon, TrashIcon, PlusCircleIcon, CheckIcon, XCircleIcon, TrophyIcon, BellIcon, TrendingUpIcon, PrizeIcon, DownloadIcon, UserCircleIcon, ClipboardListIcon, SparklesIcon, BronzeMedalIcon, SilverMedalIcon, GoldMedalIcon, DiamondMedalIcon, UsersIcon } from './components/icons';
import HistoryChart from './components/HistoryChart';

// Helper functions for localStorage
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving to localStorage key “${key}”:`, error);
    }
};

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}


type Page = 'dashboard' | 'actions' | 'missions' | 'prizes' | 'history' | 'leaderboard' | 'admin';

// Helper function to get the current month in YYYY-MM format
const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

// Helper function to get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

const getMedalForPoints = (points: number): Medal => {
    if (points >= MEDAL_TIERS[Medal.DIAMOND].points) return Medal.DIAMOND;
    if (points >= MEDAL_TIERS[Medal.GOLD].points) return Medal.GOLD;
    if (points >= MEDAL_TIERS[Medal.SILVER].points) return Medal.SILVER;
    return Medal.BRONZE;
};

const getNextMedalInfo = (points: number) => {
    const currentMedal = getMedalForPoints(points);
    if (currentMedal === Medal.DIAMOND) {
        return { nextMedal: null, pointsNeeded: 0, progress: 100, tierStart: MEDAL_TIERS[Medal.DIAMOND].points };
    }
    const nextMedal = currentMedal === Medal.BRONZE ? Medal.SILVER : currentMedal === Medal.SILVER ? Medal.GOLD : Medal.DIAMOND;
    const tierStart = MEDAL_TIERS[currentMedal].points;
    const tierEnd = MEDAL_TIERS[nextMedal].points;
    const pointsNeeded = tierEnd - points;
    const progress = ((points - tierStart) / (tierEnd - tierStart)) * 100;
    return { nextMedal, pointsNeeded, progress, tierStart };
};

// --- Custom Hooks ---
const useAnimatedCounter = (targetValue: number, duration = 500) => {
    const [currentValue, setCurrentValue] = useState(targetValue);
    const frameRef = useRef<number>();
    const prevValueRef = useRef(targetValue);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const diff = targetValue - startValue;
        if (diff === 0) return;

        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const animatedValue = Math.floor(startValue + diff * progress);
            
            setCurrentValue(animatedValue);

            if (elapsedTime < duration) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setCurrentValue(targetValue);
                prevValueRef.current = targetValue;
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            prevValueRef.current = targetValue;
        };
    }, [targetValue, duration]);

    return currentValue;
};

// --- Global Scope Declarations ---
declare const confetti: any;

const triggerConfetti = () => {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
        });
    }
};


// --- SUB-COMPONENTS (MOVED OUTSIDE APP COMPONENT) ---

const LoginScreen: React.FC<{ onLogin: (u: string, p: string) => boolean; showNotification: (m: string, t: 'error') => void; }> = ({ onLogin, showNotification }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!onLogin(username, password)) {
            showNotification('Usuário ou senha inválidos.', 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-xl shadow-lg animate-fade-in-down">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-400">Prisma Points</h1>
                    <p className="mt-2 text-slate-400">Faça login para continuar</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-300">Usuário</label>
                        <input id="username" name="username" type="text" required value={username} onChange={e => setUsername(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-300">Senha</label>
                        <input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <button type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-800 transition-colors">
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Sidebar: React.FC<{ user: User; currentPage: Page; setPage: (page: Page) => void; onLogout: () => void; }> = ({ user, currentPage, setPage, onLogout }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { id: 'actions', label: 'Registrar Ação', icon: CheckCircleIcon },
        { id: 'missions', label: 'Missões', icon: SparklesIcon},
        { id: 'prizes', label: 'Resgatar Prêmios', icon: GiftIcon },
        { id: 'history', label: 'Meu Histórico', icon: ChartBarIcon },
        { id: 'leaderboard', label: 'Ranking', icon: TrophyIcon },
    ];

    return (
        <aside className="w-16 md:w-64 bg-slate-800 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-center md:justify-start md:px-6 h-20 border-b border-slate-700">
                 <StarIcon className="h-8 w-8 text-indigo-400" />
                 <span className="hidden md:block ml-3 text-2xl font-bold text-slate-100">Prisma</span>
            </div>
            <nav className="flex-1 px-2 md:px-4 py-4 space-y-2">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setPage(item.id as Page)}
                        className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentPage === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                        <item.icon className="h-6 w-6" />
                        <span className="hidden md:block ml-4 font-medium">{item.label}</span>
                    </button>
                ))}
                {user.role === Role.ADMIN && (
                     <button onClick={() => setPage('admin')}
                        className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentPage === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                        <CogIcon className="h-6 w-6" />
                        <span className="hidden md:block ml-4 font-medium">Admin</span>
                    </button>
                )}
            </nav>
            <div className="px-2 md:px-4 py-4 border-t border-slate-700">
                 <button onClick={onLogout} className="w-full flex items-center justify-center md:justify-start p-3 rounded-lg text-slate-400 hover:bg-red-600 hover:text-white transition-colors">
                    <LogoutIcon className="h-6 w-6" />
                    <span className="hidden md:block ml-4 font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
};

const Header: React.FC<{ user: User, points: number, pointsJustUpdated: boolean, unreadCount: number, onToggleNotifications: () => void, onOpenProfile: () => void, notificationsToggleRef: React.RefObject<HTMLButtonElement> }> = ({ user, points, pointsJustUpdated, unreadCount, onToggleNotifications, onOpenProfile, notificationsToggleRef }) => {
    return (
        <header className="flex items-center justify-between h-20 px-8 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
             <div className="flex items-center space-x-4">
                 <h1 className="text-xl font-semibold text-slate-100">Bem-vindo, {user.name.split(' ')[0]}!</h1>
             </div>
             <div className="flex items-center space-x-6">
                <div className={`flex items-center space-x-2 bg-slate-700 px-4 py-2 rounded-full ${pointsJustUpdated ? 'animate-glow' : ''}`}>
                    <StarIcon className="h-6 w-6 text-yellow-400"/>
                    <span className="font-bold text-lg text-white">{points}</span>
                </div>
                <button ref={notificationsToggleRef} onClick={onToggleNotifications} className="relative text-slate-400 hover:text-white transition-colors">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{unreadCount}</span>}
                </button>
                <button onClick={onOpenProfile} className="text-slate-400 hover:text-white transition-colors">
                    <UserCircleIcon className="h-8 w-8" />
                </button>
             </div>
        </header>
    );
};

const medalIconMap: { [key: string]: React.FC<{ className?: string }> } = {
    Bronze: BronzeMedalIcon,
    Silver: SilverMedalIcon,
    Gold: GoldMedalIcon,
    Diamond: DiamondMedalIcon,
};

type PageContentProps = {
    page: Page;
    currentUser: User;
    actions: Action[];
    groupedActions: { [key: string]: Action[] };
    prizes: Prize[];
    groupedPrizes: { [key: string]: Prize[] };
    users: User[];
    loggedActions: LoggedAction[];
    redemptions: Redemption[];
    onLogAction: (actionId: number, notes: string) => void;
    onRedeemPrize: (prize: Prize) => void;
    historyData: HistoryEntry[];
    leaderboardData: (User & { monthlyPoints: number; medal: Medal; })[];
    onValidateAction: (logId: number, status: Status.VALIDATED | Status.REJECTED) => void;
    onApproveRedemption: (redemptionId: number, status: Status.APPROVED | Status.REFUSED) => void;
    isActionLoggingLocked: boolean;
    isPrizesLocked: boolean;
    adminSettings: AdminSettings;
    onSettingsChange: (settings: AdminSettings) => void;
    onSaveUser: (user: User | null) => void;
    onDeleteUser: (userId: number) => void;
    onSaveAction: (action: Action | null) => void;
    onDeleteAction: (actionId: number) => void;
    onSavePrize: (prize: Prize | null) => void;
    onDeletePrize: (prizeId: number) => void;
    onSendNotification: (recipientId: number | 'all', message: string) => void;
    onBulkValidate: (userId: number, status: Status.VALIDATED | Status.REJECTED) => void;
    onAdminLogAction: (userId: number, actionId: number, notes: string) => void;
    missions: (Mission & UserMissionProgress)[];
    allMissions: Mission[];
    onClaimMissionReward: (missionId: number) => void;
    onSaveMission: (mission: Mission | null) => void;
    onDeleteMission: (missionId: number) => void;
    specialEvents: SpecialEvent[];
    onSaveEvent: (event: SpecialEvent | null) => void;
    onDeleteEvent: (eventId: number) => void;
    activeSpecialEvent: SpecialEvent | undefined;
    getBonusPointsForAction: (action: Action) => number;
    exitingLog: { id: number; status: string } | null;
};

const Dashboard: React.FC<PageContentProps> = ({ currentUser, historyData, leaderboardData, activeSpecialEvent }) => {
    const currentMonthData = historyData.find(h => h.month === getCurrentMonth());
    const monthlyPoints = currentMonthData?.pontosGanhos || 0;
    const { nextMedal, pointsNeeded, progress } = getNextMedalInfo(monthlyPoints);
    const currentMedal = getMedalForPoints(monthlyPoints);
    const currentMedalInfo = MEDAL_TIERS[currentMedal];
    const CurrentMedalIcon = currentMedalInfo ? medalIconMap[currentMedalInfo.iconName] : StarIcon;
    const nextMedalTier = nextMedal ? MEDAL_TIERS[nextMedal] : null;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
             {activeSpecialEvent && (
                <div className="bg-yellow-400/10 border border-yellow-400 text-yellow-300 px-4 py-3 rounded-lg relative animate-fade-in" role="alert">
                    <strong className="font-bold">Evento Especial Ativo!</strong>
                    <span className="block sm:inline ml-2">{activeSpecialEvent.name}: {activeSpecialEvent.description}</span>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Medal Progress Card */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in">
                        <h2 className="text-xl font-semibold mb-4 text-indigo-400">Progresso Mensal</h2>
                        <div className="flex items-center space-x-6">
                            <CurrentMedalIcon className="w-20 h-20"/>
                            <div className="flex-1">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-slate-300 font-medium">{currentMedal} ({monthlyPoints} pts)</span>
                                    {nextMedal && (
                                        <span className={`text-sm font-semibold ${nextMedalTier?.color}`}>
                                            Próxima: {nextMedal} ({nextMedalTier?.points} pts)
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-4">
                                    <div className={`${MEDAL_TIERS[currentMedal].progressColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                                </div>
                                {nextMedal && <p className="text-right text-slate-400 mt-1 text-sm">Faltam {pointsNeeded} pontos para a próxima medalha!</p>}
                                {!nextMedal && <p className="text-right text-green-400 mt-1 text-sm font-semibold">Você atingiu a medalha máxima!</p>}
                            </div>
                        </div>
                    </div>
                    <HistoryChart data={historyData} />
                </div>
                {/* Quick Leaderboard */}
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-xl font-semibold mb-4 text-indigo-400">Ranking do Mês</h2>
                    <ul className="space-y-4">
                        {leaderboardData.slice(0, 5).map((user, index) => {
                            const medalInfo = MEDAL_TIERS[user.medal];
                            const MedalIcon = medalInfo ? medalIconMap[medalInfo.iconName] : StarIcon;
                            return (
                                <li key={user.id} className="flex items-center space-x-4 p-2 rounded-md bg-slate-700/50">
                                    <span className="text-lg font-bold text-slate-400 w-6">{index + 1}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-200">{user.name}</p>
                                        <p className="text-sm text-slate-400">{user.monthlyPoints} pontos</p>
                                    </div>
                                    <MedalIcon className="w-8 h-8"/>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const ActionsPage: React.FC<Pick<PageContentProps, 'groupedActions' | 'onLogAction' | 'isActionLoggingLocked' | 'activeSpecialEvent' | 'getBonusPointsForAction'>> = ({ groupedActions, onLogAction, isActionLoggingLocked, activeSpecialEvent, getBonusPointsForAction }) => {
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(Object.keys(groupedActions)[0] || null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAction || isSubmitting) return;
        setIsSubmitting(true);
        setTimeout(() => {
            onLogAction(selectedAction.id, notes);
            setSelectedAction(null);
            setNotes('');
            setIsSubmitting(false);
        }, 500);
    };

    if (isActionLoggingLocked) {
        return (
             <div className="text-center p-8 bg-slate-800 rounded-lg">
                <h1 className="text-2xl font-bold text-yellow-400 mb-2">Registro de Ações Bloqueado</h1>
                <p className="text-slate-400">O período para registrar ações do mês anterior foi encerrado.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Registrar Ação</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                    <h2 className="text-xl font-semibold text-indigo-400">1. Escolha uma Ação</h2>
                    <div className="space-y-2">
                        {Object.entries(groupedActions).map(([category, actions]) => (
                            <div key={category} className="border-b border-slate-700 last:border-b-0 py-2">
                                <button onClick={() => setExpandedCategory(expandedCategory === category ? null : category)} className="w-full text-left font-semibold text-slate-200 text-lg flex justify-between items-center">
                                    {category}
                                    <svg className={`w-5 h-5 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedCategory === category ? 'max-h-screen' : 'max-h-0'}`}>
                                <ul className="mt-2 space-y-2 pl-2">
                                    {(actions as Action[]).map(action => (
                                        <li key={action.id}>
                                            <button onClick={() => setSelectedAction(action)} className={`w-full text-left p-3 rounded-md transition-colors text-sm ${selectedAction?.id === action.id ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}>
                                                <p className="font-medium">{action.description}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    <span className="font-bold text-yellow-400">+{action.points}</span> pontos | Validador: {action.validator}
                                                    {activeSpecialEvent?.type === SpecialEventType.DOUBLE_POINTS_CATEGORY && activeSpecialEvent.config.category === action.category &&
                                                        <span className="ml-2 px-2 py-0.5 bg-yellow-400/20 text-yellow-300 text-xs rounded-full">PONTOS EM DOBRO!</span>
                                                    }
                                                </p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-indigo-400 mb-4">2. Detalhes do Registro</h2>
                    {selectedAction ? (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                            <div>
                                <h3 className="font-semibold text-slate-200">{selectedAction.description}</h3>
                                <p className="text-sm text-slate-400">Você ganhará <span className="font-bold text-yellow-400">{selectedAction.points + getBonusPointsForAction(selectedAction)}</span> pontos com esta ação.</p>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">Notas / Evidências</label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: Link da chamada, nome do cliente, etc."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => setSelectedAction(null)} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition">
                                    {isSubmitting ? 'Registrando...' : 'Registrar Ação'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            <p>Selecione uma ação da lista para começar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MissionCard: React.FC<{ mission: Mission & UserMissionProgress, onClaimMissionReward: (missionId: number) => void }> = ({ mission, onClaimMissionReward }) => {
    const progressPercentage = Math.min((mission.progress / mission.goal.count) * 100, 100);

    return (
        <div className="bg-slate-800 p-5 rounded-lg flex flex-col justify-between shadow-lg animate-fade-in">
            <div>
                <div className="flex justify-between items-start">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        mission.type === MissionType.DAILY ? 'bg-green-500/20 text-green-400' :
                        mission.type === MissionType.WEEKLY ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                    }`}>{mission.type}</span>
                    <div className="flex items-center text-yellow-400">
                         <StarIcon className="w-5 h-5 mr-1"/>
                         <span className="font-bold text-lg">{mission.rewardPoints}</span>
                    </div>
                </div>
                <h3 className="text-lg font-bold mt-2 text-slate-100">{mission.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{mission.description}</p>
            </div>
            <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">Progresso</span>
                    <span className="font-semibold">{mission.progress} / {mission.goal.count}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`}}></div>
                </div>
                
                {mission.status === UserMissionProgressStatus.COMPLETED && (
                    <button 
                        onClick={() => onClaimMissionReward(mission.id)}
                        className="w-full mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition"
                    >
                        Resgatar Recompensa
                    </button>
                )}
                {mission.status === UserMissionProgressStatus.CLAIMED && (
                    <div className="w-full mt-4 py-2 px-4 rounded-md text-sm font-medium text-center text-green-400 bg-green-500/10">
                        Recompensa Resgatada!
                    </div>
                )}
                 {mission.status === UserMissionProgressStatus.IN_PROGRESS && <div className="h-10 mt-4"></div>}
            </div>
        </div>
    );
};

const MissionsPage: React.FC<Pick<PageContentProps, 'missions' | 'onClaimMissionReward'>> = ({ missions, onClaimMissionReward }) => {
    const missionGroups = missions.reduce((acc, mission) => {
        const type = mission.type;
        (acc[type] = acc[type] || []).push(mission);
        return acc;
    }, {} as { [key in MissionType]?: (Mission & UserMissionProgress)[] });
    
    const groupOrder: MissionType[] = [MissionType.DAILY, MissionType.WEEKLY, MissionType.MONTHLY];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Missões</h1>
            {groupOrder.map(group => {
                const missionsInGroup = missionGroups[group];
                if (!missionsInGroup || missionsInGroup.length === 0) return null;
                return (
                    <div key={group}>
                        <h2 className="text-2xl font-semibold text-indigo-400 mb-4">{group}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {missionsInGroup.map(mission => <MissionCard key={mission.id} mission={mission} onClaimMissionReward={onClaimMissionReward} />)}
                        </div>
                    </div>
                )
            })}
             {missions.length === 0 && <div className="text-center p-8 bg-slate-800 rounded-lg"><p>Nenhuma missão disponível no momento.</p></div>}
        </div>
    );
};

const PrizeCard: React.FC<{ prize: Prize, currentUser: User, isPrizesLocked: boolean, onRedeemPrize: (prize: Prize) => void }> = ({ prize, currentUser, isPrizesLocked, onRedeemPrize }) => {
    const canAfford = currentUser.points >= prize.cost;
    return (
        <div className={`bg-slate-800 p-5 rounded-lg flex flex-col justify-between shadow-lg transition-all animate-fade-in ${!canAfford ? 'opacity-60' : ''}`}>
            <div>
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-slate-700 mx-auto">
                    <PrizeIcon iconName={prize.icon} className="h-8 w-8 text-indigo-300" />
                </div>
                <h3 className="text-md font-bold text-center mt-3 text-slate-100">{prize.description}</h3>
                <p className="text-sm text-slate-400 text-center mt-1">{prize.benefit}</p>
            </div>
            <div className="mt-4">
                <p className="text-center font-bold text-2xl text-yellow-400 mb-3">{prize.cost} pts</p>
                 <button
                    onClick={() => onRedeemPrize(prize)}
                    disabled={!canAfford || isPrizesLocked}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                 >
                    {isPrizesLocked ? 'Loja Bloqueada' : !canAfford ? 'Pontos Insuficientes' : 'Resgatar'}
                 </button>
            </div>
        </div>
    );
};

const PrizesPage: React.FC<Pick<PageContentProps, 'groupedPrizes' | 'currentUser' | 'isPrizesLocked' | 'onRedeemPrize'>> = ({ groupedPrizes, currentUser, isPrizesLocked, onRedeemPrize }) => {
    
    if (!currentUser) return null;

    if (isPrizesLocked) {
         return (
             <div className="text-center p-8 bg-slate-800 rounded-lg">
                <h1 className="text-2xl font-bold text-yellow-400 mb-2">Loja de Prêmios Bloqueada</h1>
                <p className="text-slate-400">A loja está temporariamente indisponível. Tente novamente mais tarde.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-100">Resgatar Prêmios</h1>
            {Object.keys(groupedPrizes).map((category) => (
                <div key={category}>
                    <h2 className="text-2xl font-semibold text-indigo-400 mb-4">{category}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {groupedPrizes[category].map(prize => <PrizeCard key={prize.id} prize={prize} currentUser={currentUser} onRedeemPrize={onRedeemPrize} isPrizesLocked={isPrizesLocked}/>)}
                    </div>
                </div>
            ))}
        </div>
    );
};

const HistoryPage: React.FC<Pick<PageContentProps, 'historyData' | 'loggedActions' | 'redemptions' | 'actions' | 'prizes' | 'currentUser'>> = ({ historyData, loggedActions, redemptions, actions, prizes, currentUser }) => {
    const [selectedMonth, setSelectedMonth] = useState<string | null>(historyData.length > 0 ? historyData[historyData.length - 1].month : null);

    const monthDetails = useMemo(() => {
        if (!selectedMonth || !currentUser) return null;
        
        const validated = loggedActions.filter(l => l.userId === currentUser.id && l.month === selectedMonth && l.status === Status.VALIDATED).map(l => ({ ...l, action: actions.find(a => a.id === l.actionId) }));
        const redeemed = redemptions.filter(r => r.userId === currentUser.id && r.requestDate.startsWith(selectedMonth) && r.status === Status.APPROVED).map(r => ({...r, prize: prizes.find(p => p.id === r.prizeId)}));
        
        return { validated, redeemed };
    }, [selectedMonth, loggedActions, redemptions, actions, prizes, currentUser]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Meu Histórico</h1>
            <HistoryChart data={historyData} />
            <div className="bg-slate-800 p-6 rounded-lg">
                 <h2 className="text-xl font-semibold text-indigo-400 mb-4">Detalhes por Mês</h2>
                 <select value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="" disabled>Selecione um mês</option>
                    {historyData.map(h => <option key={h.month} value={h.month}>{new Date(`${h.month}-02`).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</option>)}
                 </select>
                 
                 {monthDetails && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-fade-in">
                        <div>
                            <h3 className="font-semibold mb-2">Ações Validadas</h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {monthDetails.validated.length > 0 ? monthDetails.validated.map(l => (
                                    <li key={l.id} className="bg-slate-700/50 p-3 rounded-md text-sm">
                                        <p>{l.action?.description}</p>
                                        <p className="text-green-400 font-medium">+{l.action?.points} pontos</p>
                                    </li>
                                )) : <p className="text-slate-400">Nenhuma ação validada este mês.</p>}
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold mb-2">Prêmios Resgatados</h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {monthDetails.redeemed.length > 0 ? monthDetails.redeemed.map(r => (
                                     <li key={r.id} className="bg-slate-700/50 p-3 rounded-md text-sm">
                                        <p>{r.prize?.description}</p>
                                        <p className="text-red-400 font-medium">-{r.prize?.cost} pontos</p>
                                    </li>
                                )) : <p className="text-slate-400">Nenhum prêmio resgatado este mês.</p>}
                            </ul>
                        </div>
                     </div>
                 )}
                 {!selectedMonth && <p className="mt-6 text-slate-400">Selecione um mês para ver os detalhes.</p>}
            </div>
        </div>
    );
};

const LeaderboardPage: React.FC<Pick<PageContentProps, 'leaderboardData'>> = ({ leaderboardData }) => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Ranking do Mês</h1>
             <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-16">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Analista</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Pontos no Mês</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Medalha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {leaderboardData.map((user, index) => {
                             const medalInfo = MEDAL_TIERS[user.medal];
                             const MedalIcon = medalInfo ? medalIconMap[medalInfo.iconName] : StarIcon;
                             return (
                                <tr key={user.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-yellow-400">{user.monthlyPoints}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <MedalIcon className="w-6 h-6" />
                                            <span className="ml-2">{user.medal}</span>
                                        </div>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- ADMIN SUB-COMPONENTS ---
const AdminOverviewComponent: React.FC<
    Pick<PageContentProps, 'users' | 'loggedActions' | 'redemptions' | 'actions' | 'prizes' | 'adminSettings' | 'activeSpecialEvent' | 'isActionLoggingLocked'> & {
    onNavigate: (tab: string) => void;
}> = ({
    users,
    loggedActions,
    redemptions,
    actions,
    prizes,
    adminSettings,
    activeSpecialEvent,
    isActionLoggingLocked,
    onNavigate
}) => {
    const { 
        pendingValidationsCount, 
        pendingRedemptionsCount, 
        totalAnalystUsers, 
        totalPointsInCirculation, 
        recentActivities 
    } = useMemo(() => {
        const combinedActivities = [
            ...loggedActions.map(log => ({
                id: `log-${log.id}`,
                type: 'action' as 'action' | 'redemption',
                date: new Date(log.id),
                user: users.find(u => u.id === log.userId)?.name || 'N/A',
                description: actions.find(a => a.id === log.actionId)?.description || 'N/A',
            })),
            ...redemptions.map(red => ({
                id: `red-${red.id}`,
                type: 'redemption' as 'action' | 'redemption',
                date: new Date(red.requestDate),
                user: users.find(u => u.id === red.userId)?.name || 'N/A',
                description: prizes.find(p => p.id === red.prizeId)?.description || 'N/A',
            }))
        ];

        const recentActivities = combinedActivities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
            .map(activity => ({
                ...activity,
                text: activity.type === 'action' 
                    ? `${activity.user} registrou: "${activity.description}"`
                    : `${activity.user} resgatou: "${activity.description}"`
            }));

        return {
            pendingValidationsCount: loggedActions.filter(l => l.status === Status.PENDING_VALIDATION).length,
            pendingRedemptionsCount: redemptions.filter(r => r.status === Status.PENDING_APPROVAL).length,
            totalAnalystUsers: users.filter(u => u.role === Role.ANALYST).length,
            totalPointsInCirculation: users.reduce((sum, user) => sum + user.points, 0),
            recentActivities,
        };
    }, [users, loggedActions, redemptions, actions, prizes]);

    const StatCard: React.FC<{ title: string; value: string | number; icon: React.FC<{className?: string}>; onClick?: () => void; }> = ({ title, value, icon: Icon, onClick }) => (
        <div 
            className={`bg-slate-700 p-6 rounded-lg shadow-md flex items-center justify-between ${onClick ? 'cursor-pointer hover:bg-slate-600 transition' : ''}`}
            onClick={onClick}
        >
            <div>
                <p className="text-sm font-medium text-slate-400 uppercase">{title}</p>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <Icon className="w-10 h-10 text-indigo-400" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Validações Pendentes" value={pendingValidationsCount} icon={ClipboardListIcon} onClick={() => onNavigate('validations')} />
                <StatCard title="Resgates Pendentes" value={pendingRedemptionsCount} icon={GiftIcon} onClick={() => onNavigate('redemptions')} />
                <StatCard title="Total de Analistas" value={totalAnalystUsers} icon={UsersIcon} />
                <StatCard title="Pontos em Circulação" value={totalPointsInCirculation.toLocaleString('pt-BR')} icon={StarIcon} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-lg">
                     <h3 className="text-xl font-semibold text-indigo-400 mb-4">Atividade Recente</h3>
                     <ul className="space-y-4">
                        {recentActivities.length > 0 ? recentActivities.map(activity => (
                             <li key={activity.id} className="flex items-start space-x-4">
                                <div className={`p-2 rounded-full ${activity.type === 'action' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                                    {activity.type === 'action' ? <CheckCircleIcon className="w-5 h-5 text-blue-400" /> : <GiftIcon className="w-5 h-5 text-green-400" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-200">{activity.text}</p>
                                    <p className="text-xs text-slate-400">{new Date(activity.date).toLocaleString('pt-BR')}</p>
                                </div>
                             </li>
                        )) : <p className="text-slate-400">Nenhuma atividade recente.</p>}
                     </ul>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                     <h3 className="text-xl font-semibold text-indigo-400 mb-4">Status do Sistema</h3>
                     <div className={`p-4 rounded-md ${activeSpecialEvent ? 'bg-yellow-400/20 text-yellow-300' : 'bg-slate-700'}`}>
                         <h4 className="font-semibold">Evento Especial</h4>
                         <p className="text-sm">{activeSpecialEvent ? `${activeSpecialEvent.name} (Ativo)` : 'Nenhum evento ativo'}</p>
                     </div>
                      <div className={`p-4 rounded-md ${adminSettings.prizesLocked ? 'bg-red-400/20 text-red-300' : 'bg-slate-700'}`}>
                         <h4 className="font-semibold">Loja de Prêmios</h4>
                         <p className="text-sm">{adminSettings.prizesLocked ? 'Bloqueada' : 'Aberta'}</p>
                     </div>
                      <div className={`p-4 rounded-md ${isActionLoggingLocked ? 'bg-red-400/20 text-red-300' : 'bg-slate-700'}`}>
                         <h4 className="font-semibold">Registro de Ações</h4>
                         <p className="text-sm">{isActionLoggingLocked && adminSettings.actionsLockedUntil ? `Bloqueado até ${new Date(adminSettings.actionsLockedUntil + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Aberto'}</p>
                     </div>
                </div>
            </div>
        </div>
    );
};

const ValidationsComponent: React.FC<Pick<PageContentProps, 'loggedActions' | 'users' | 'actions' | 'onValidateAction' | 'onBulkValidate' | 'exitingLog'>> = ({ loggedActions, users, actions, onValidateAction, onBulkValidate, exitingLog }) => {
    const pendingActions = useMemo(() => {
        return loggedActions
            .filter(l => l.status === Status.PENDING_VALIDATION)
            .reduce((acc, log) => {
                const user = users.find(u => u.id === log.userId);
                if (user) {
                    (acc[user.id] = acc[user.id] || { user, logs: [] }).logs.push(log);
                }
                return acc;
            }, {} as { [key: number]: { user: User, logs: LoggedAction[] } });
    }, [loggedActions, users]);

    if (Object.keys(pendingActions).length === 0) {
        return <div className="text-center p-8 bg-slate-800 rounded-lg"><p>Nenhuma ação pendente de validação.</p></div>;
    }

    return (
        <div className="space-y-6">
            {Object.values(pendingActions).map(({ user, logs }) => (
                <div key={user.id} className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                        <h3 className="text-xl font-semibold text-indigo-400">{user.name}</h3>
                        <div className="flex space-x-2">
                            <button onClick={() => onBulkValidate(user.id, Status.VALIDATED)} className="px-3 py-1 text-sm font-medium text-green-300 bg-green-500/20 rounded-md hover:bg-green-500/40">Validar Tudo</button>
                            <button onClick={() => onBulkValidate(user.id, Status.REJECTED)} className="px-3 py-1 text-sm font-medium text-red-300 bg-red-500/20 rounded-md hover:bg-red-500/40">Rejeitar Tudo</button>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {logs.map(log => {
                            const action = actions.find(a => a.id === log.actionId);
                            const isExiting = exitingLog?.id === log.id;
                            const exitClass = isExiting ? (exitingLog.status === 'VALIDATED' ? 'animate-slide-out-left' : 'animate-slide-out-right') : '';

                            return (
                                <li key={log.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-700 rounded-md transition-all duration-500 gap-2 ${exitClass}`}>
                                    <div className="flex-1">
                                        <p className="font-medium">{action?.description}</p>
                                        <p className="text-sm text-slate-400 mt-1">"{log.notes}"</p>
                                    </div>
                                    <div className="flex items-center justify-end space-x-2">
                                        <span className="text-yellow-400 font-bold">+{action?.points}</span>
                                        <button onClick={() => onValidateAction(log.id, Status.REJECTED)} title="Rejeitar" className="p-2 rounded-full hover:bg-red-500/20 text-red-400"><XCircleIcon className="w-6 h-6" /></button>
                                        <button onClick={() => onValidateAction(log.id, Status.VALIDATED)} title="Validar" className="p-2 rounded-full hover:bg-green-500/20 text-green-400"><CheckCircleIcon className="w-6 h-6" /></button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

const RedemptionsComponent: React.FC<Pick<PageContentProps, 'redemptions' | 'users' | 'prizes' | 'onApproveRedemption'>> = ({ redemptions, users, prizes, onApproveRedemption }) => {
    const pendingRedemptions = redemptions.filter(r => r.status === Status.PENDING_APPROVAL);

    if (pendingRedemptions.length === 0) {
        return <div className="text-center p-8 bg-slate-800 rounded-lg"><p>Nenhum resgate pendente de aprovação.</p></div>;
    }

    return (
         <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="min-w-full responsive-table">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Prêmio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Custo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {pendingRedemptions.map(redemption => {
                        const user = users.find(u => u.id === redemption.userId);
                        const prize = prizes.find(p => p.id === redemption.prizeId);
                        return (
                            <tr key={redemption.id}>
                                <td data-label="Usuário" className="px-6 py-4 whitespace-nowrap">{user?.name}</td>
                                <td data-label="Prêmio" className="px-6 py-4 whitespace-nowrap">{prize?.description}</td>
                                <td data-label="Custo" className="px-6 py-4 whitespace-nowrap text-yellow-400">{prize?.cost}</td>
                                <td data-label="Data" className="px-6 py-4 whitespace-nowrap">{new Date(redemption.requestDate).toLocaleDateString()}</td>
                                <td data-label="Ações" className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex space-x-2">
                                        <button onClick={() => onApproveRedemption(redemption.id, Status.REFUSED)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"><XCircleIcon className="w-6 h-6" /></button>
                                        <button onClick={() => onApproveRedemption(redemption.id, Status.APPROVED)} className="p-2 text-green-400 hover:bg-green-500/20 rounded-full"><CheckCircleIcon className="w-6 h-6" /></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ManageGenericComponent: React.FC<{
    title: string;
    items: any[];
    columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
    onAddItem: () => void;
    onEditItem: (item: any) => void;
    onDeleteItem: (id: number) => void;
    addLabel: string;
}> = ({ title, items, columns, onAddItem, onEditItem, onDeleteItem, addLabel }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-indigo-400">{title}</h3>
            <button onClick={onAddItem} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                {addLabel}
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full responsive-table">
                <thead className="bg-slate-700">
                    <tr>
                        {columns.map(col => <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{col.label}</th>)}
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {items.map(item => (
                        <tr key={item.id}>
                            {columns.map(col => (
                                <td key={col.key} data-label={col.label} className="px-6 py-4 whitespace-nowrap">{col.render ? col.render(item) : item[col.key]}</td>
                            ))}
                            <td data-label="Ações" className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                    <button onClick={() => onEditItem(item)} className="text-slate-400 hover:text-indigo-400"><PencilIcon /></button>
                                    <button onClick={() => onDeleteItem(item.id)} className="text-slate-400 hover:text-red-400"><TrashIcon /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ManageUsersComponent: React.FC<Pick<PageContentProps, 'users' | 'onSaveUser' | 'onDeleteUser'>> = ({ users, onSaveUser, onDeleteUser }) => (
    <ManageGenericComponent
        title="Gerenciar Usuários"
        items={users}
        columns={[{key: 'name', label: 'Nome'}, {key: 'username', label: 'Usuário'}, {key: 'role', label: 'Cargo'}, {key: 'points', label: 'Pontos'}]}
        onAddItem={() => onSaveUser(null)}
        onEditItem={(user) => onSaveUser(user)}
        onDeleteItem={onDeleteUser}
        addLabel="Adicionar Usuário"
    />
);

const ManageActionsComponent: React.FC<Pick<PageContentProps, 'actions' | 'onSaveAction' | 'onDeleteAction'>> = ({ actions, onSaveAction, onDeleteAction }) => (
    <ManageGenericComponent
        title="Gerenciar Ações"
        items={actions}
        columns={[{key: 'category', label: 'Categoria'}, {key: 'description', label: 'Descrição'}, {key: 'points', label: 'Pontos'}, {key: 'validator', label: 'Validador'}]}
        onAddItem={() => onSaveAction(null)}
        onEditItem={(action) => onSaveAction(action)}
        onDeleteItem={onDeleteAction}
        addLabel="Adicionar Ação"
    />
);

const ManagePrizesComponent: React.FC<Pick<PageContentProps, 'prizes' | 'onSavePrize' | 'onDeletePrize'>> = ({ prizes, onSavePrize, onDeletePrize }) => (
    <ManageGenericComponent
        title="Gerenciar Prêmios"
        items={prizes}
        columns={[{key: 'category', label: 'Categoria'}, {key: 'description', label: 'Descrição'}, {key: 'cost', label: 'Custo'}, {key: 'benefit', label: 'Benefício'}]}
        onAddItem={() => onSavePrize(null)}
        onEditItem={(prize) => onSavePrize(prize)}
        onDeleteItem={onDeletePrize}
        addLabel="Adicionar Prêmio"
    />
);

const ManageMissionsComponent: React.FC<Pick<PageContentProps, 'allMissions' | 'onSaveMission' | 'onDeleteMission'>> = ({ allMissions, onSaveMission, onDeleteMission }) => (
    <ManageGenericComponent
        title="Gerenciar Missões"
        items={allMissions}
        columns={[{key: 'title', label: 'Título'}, {key: 'type', label: 'Tipo'}, {key: 'rewardPoints', label: 'Recompensa'}, {key: 'isGlobal', label: 'Global', render: (m) => m.isGlobal ? 'Sim' : 'Não'}]}
        onAddItem={() => onSaveMission(null)}
        onEditItem={(mission) => onSaveMission(mission)}
        onDeleteItem={onDeleteMission}
        addLabel="Adicionar Missão"
    />
);

const ManageEventsComponent: React.FC<Pick<PageContentProps, 'specialEvents' | 'onSaveEvent' | 'onDeleteEvent'>> = ({ specialEvents, onSaveEvent, onDeleteEvent }) => (
    <ManageGenericComponent
        title="Gerenciar Eventos Especiais"
        items={specialEvents}
        columns={[
            {key: 'name', label: 'Nome'}, 
            {key: 'type', label: 'Tipo'}, 
            {key: 'startDate', label: 'Início', render: (e) => new Date(e.startDate + 'T00:00:00').toLocaleDateString()}, 
            {key: 'endDate', label: 'Fim', render: (e) => new Date(e.endDate + 'T00:00:00').toLocaleDateString()}
        ]}
        onAddItem={() => onSaveEvent(null)}
        onEditItem={(event) => onSaveEvent(event)}
        onDeleteItem={onDeleteEvent}
        addLabel="Adicionar Evento"
    />
);

const SettingsComponent: React.FC<Pick<PageContentProps, 'adminSettings' | 'onSettingsChange' | 'users' | 'actions' | 'onSendNotification' | 'onAdminLogAction'>> = ({ adminSettings, onSettingsChange, users, actions, onSendNotification, onAdminLogAction }) => {
    
    const [notificationRecipient, setNotificationRecipient] = useState<'all' | number>('all');
    const [notificationMessage, setNotificationMessage] = useState('');
    
    const [logForUser, setLogForUser] = useState<number | ''>('');
    const [logAction, setLogAction] = useState<number | ''>('');
    const [logNotes, setLogNotes] = useState('');

    const handleNotificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notificationMessage.trim()) return;
        onSendNotification(notificationRecipient, notificationMessage);
        setNotificationMessage('');
    };

    const handleAdminLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!logForUser || !logAction) return;
        onAdminLogAction(Number(logForUser), Number(logAction), logNotes);
        setLogForUser('');
        setLogAction('');
        setLogNotes('');
    };

    return (
        <div className="space-y-8">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">Configurações Gerais</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="prizesLocked" className="text-slate-300">Bloquear loja de prêmios</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="prizesLocked" className="sr-only peer" checked={adminSettings.prizesLocked} onChange={e => onSettingsChange({...adminSettings, prizesLocked: e.target.checked})} />
                            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                     <div className="flex items-center justify-between">
                        <label htmlFor="actionsLockedUntil" className="text-slate-300">Bloquear registro de ações até:</label>
                        <input
                            type="date"
                            id="actionsLockedUntil"
                            value={adminSettings.actionsLockedUntil || ''}
                            onChange={e => onSettingsChange({...adminSettings, actionsLockedUntil: e.target.value})}
                            className="bg-slate-700 border border-slate-600 rounded-md px-3 py-1"
                        />
                    </div>
                </div>
            </div>
            
             <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">Enviar Notificação</h3>
                <form onSubmit={handleNotificationSubmit} className="space-y-4">
                     <select value={notificationRecipient} onChange={e => setNotificationRecipient(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full bg-slate-700 p-2 rounded">
                        <option value="all">Todos os Usuários</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <textarea value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} placeholder="Sua mensagem..." rows={3} className="w-full bg-slate-700 p-2 rounded" required />
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Enviar</button>
                </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">Registrar Ação para Usuário</h3>
                 <form onSubmit={handleAdminLogSubmit} className="space-y-4">
                    <select value={logForUser} onChange={e => setLogForUser(Number(e.target.value))} className="w-full bg-slate-700 p-2 rounded" required>
                        <option value="" disabled>Selecione um usuário</option>
                        {users.filter(u => u.role === Role.ANALYST).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select value={logAction} onChange={e => setLogAction(Number(e.target.value))} className="w-full bg-slate-700 p-2 rounded" required>
                        <option value="" disabled>Selecione uma ação</option>
                        {actions.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                    </select>
                    <input type="text" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notas (opcional)" className="w-full bg-slate-700 p-2 rounded" />
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Registrar</button>
                </form>
            </div>
        </div>
    );
};


const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
    return (
        <div className="fixed top-5 right-5 z-50 space-y-3 w-full max-w-xs">
            {toasts.map(toast => (
                <div key={toast.id} className={`flex items-center w-full p-4 rounded-lg shadow text-slate-200 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-slide-in-up`}>
                    <div className="ms-3 text-sm font-normal">{toast.message}</div>
                </div>
            ))}
        </div>
    );
};

const NotificationsPanel: React.FC<{ notifications: AppNotification[], onClose: () => void, users: User[], panelRef: React.RefObject<HTMLDivElement> }> = ({ notifications, onClose, users, panelRef }) => {
    return (
        <div ref={panelRef} className="absolute top-20 right-8 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-40 animate-fade-in-down">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold">Notificações</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(n => (
                    <li key={n.id} className={`p-4 border-b border-slate-700 last:border-0 ${!n.read ? 'bg-indigo-500/10' : ''}`}>
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{new Date(n.timestamp).toLocaleString()}</p>
                    </li>
                )) : <p className="p-4 text-slate-400 text-sm">Nenhuma notificação.</p>}
            </ul>
        </div>
    );
};

const ProfileModal: React.FC<{ user: User, onClose: () => void, onChangePassword: (c: string, n: string) => void }> = ({ user, onClose, onChangePassword }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onChangePassword(currentPassword, newPassword);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                <h2 className="text-2xl font-bold mb-6 text-indigo-400">Meu Perfil</h2>
                <div className="mb-6">
                    <p><span className="font-semibold text-slate-300">Nome:</span> {user.name}</p>
                    <p><span className="font-semibold text-slate-300">Usuário:</span> {user.username}</p>
                    <p><span className="font-semibold text-slate-300">Cargo:</span> {user.role}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-semibold border-t border-slate-700 pt-4">Alterar Senha</h3>
                    <div>
                        <label className="block text-sm text-slate-300">Senha Atual</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                     <div>
                        <label className="block text-sm text-slate-300">Nova Senha</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Fechar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar Senha</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserFormModal: React.FC<{ user: User | null; onSave: (data: any) => void; onClose: () => void; }> = ({ user, onSave, onClose }) => {
     const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        password: '',
        role: user?.role || Role.ANALYST,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: user?.id, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                 <h2 className="text-2xl font-bold mb-6 text-indigo-400">{user ? 'Editar' : 'Criar'} Usuário</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300">Nome</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Usuário</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Senha</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required={!user} placeholder={user ? 'Deixe em branco para não alterar' : ''} />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Cargo</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600">
                            <option value={Role.ANALYST}>Analista</option>
                            <option value={Role.ADMIN}>Admin</option>
                        </select>
                    </div>
                     <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar</button>
                     </div>
                 </form>
            </div>
        </div>
    );
};

const ActionFormModal: React.FC<{ action: Action | null; onSave: (data: any) => void; onClose: () => void; }> = ({ action, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        category: action?.category || '',
        description: action?.description || '',
        points: action?.points || 0,
        validator: action?.validator || 'Analista',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: action?.id, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                 <h2 className="text-2xl font-bold mb-6 text-indigo-400">{action ? 'Editar' : 'Criar'} Ação</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300">Categoria</label>
                        <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Descrição</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Pontos</label>
                        <input type="number" name="points" value={formData.points} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Validador</label>
                        <input type="text" name="validator" value={formData.validator} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                     <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar</button>
                     </div>
                 </form>
            </div>
        </div>
    );
};
const PrizeFormModal: React.FC<{ prize: Prize | null; onSave: (data: any) => void; onClose: () => void; }> = ({ prize, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        category: prize?.category || '',
        description: prize?.description || '',
        cost: prize?.cost || 0,
        benefit: prize?.benefit || '',
        icon: prize?.icon || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: prize?.id, ...formData });
    };
    
    const iconOptions = ['GiftIcon', 'CoffeeIcon', 'CalendarIcon', 'UsersIcon', 'BookOpenIcon', 'BriefcaseIcon', 'SunIcon', 'HomeIcon'];

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                 <h2 className="text-2xl font-bold mb-6 text-indigo-400">{prize ? 'Editar' : 'Criar'} Prêmio</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300">Categoria</label>
                        <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Descrição</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Custo (pontos)</label>
                        <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Benefício</label>
                        <input type="text" name="benefit" value={formData.benefit} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Ícone</label>
                        <select name="icon" value={formData.icon} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600">
                           {iconOptions.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                        </select>
                    </div>
                     <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar</button>
                     </div>
                 </form>
            </div>
        </div>
    );
};
const MissionFormModal: React.FC<{ mission: Mission | null; onSave: (data: any) => void; onClose: () => void; }> = ({ mission, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        title: mission?.title || '',
        description: mission?.description || '',
        type: mission?.type || MissionType.DAILY,
        rewardPoints: mission?.rewardPoints || 0,
        isGlobal: mission?.isGlobal ?? true,
        goal: {
            type: MissionGoalType.LOG_ACTION_CATEGORY,
            category: mission?.goal.category || '',
            count: mission?.goal.count || 1,
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name in formData.goal) {
            setFormData(prev => ({ ...prev, goal: { ...prev.goal, [name]: type === 'number' ? parseInt(value) : value } }));
        } else if (name === 'isGlobal') {
             setFormData(prev => ({...prev, isGlobal: (e.target as HTMLInputElement).checked }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: mission?.id, ...formData });
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                 <h2 className="text-2xl font-bold mb-6 text-indigo-400">{mission ? 'Editar' : 'Criar'} Missão</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="title" value={formData.title} onChange={handleChange} placeholder="Título" className="w-full bg-slate-700 p-2 rounded" required />
                    <input name="description" value={formData.description} onChange={handleChange} placeholder="Descrição" className="w-full bg-slate-700 p-2 rounded" required />
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded">
                        {Object.values(MissionType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input name="rewardPoints" type="number" value={formData.rewardPoints} onChange={handleChange} placeholder="Pontos de Recompensa" className="w-full bg-slate-700 p-2 rounded" required />
                    <input name="category" value={formData.goal.category} onChange={handleChange} placeholder="Categoria da Ação" className="w-full bg-slate-700 p-2 rounded" required />
                    <input name="count" type="number" value={formData.goal.count} onChange={handleChange} placeholder="Contagem Necessária" className="w-full bg-slate-700 p-2 rounded" required />
                     <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar</button>
                     </div>
                 </form>
            </div>
        </div>
    );
};
const EventFormModal: React.FC<{ event: SpecialEvent | null; onSave: (data: any) => void; onClose: () => void; actionCategories: string[] }> = ({ event, onSave, onClose, actionCategories }) => {
    const [formData, setFormData] = useState({
        name: event?.name || '',
        description: event?.description || '',
        type: event?.type || SpecialEventType.DOUBLE_POINTS_CATEGORY,
        config: {
            category: event?.config.category || '',
        },
        startDate: event?.startDate || '',
        endDate: event?.endDate || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name in formData.config) {
            setFormData(prev => ({...prev, config: {...prev.config, [name]: value}}));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: event?.id, ...formData });
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md animate-scale-in">
                 <h2 className="text-2xl font-bold mb-6 text-indigo-400">{event ? 'Editar' : 'Criar'} Evento</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Evento" className="w-full bg-slate-700 p-2 rounded" required />
                    <input name="description" value={formData.description} onChange={handleChange} placeholder="Descrição" className="w-full bg-slate-700 p-2 rounded" required />
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded" disabled>
                        <option value={SpecialEventType.DOUBLE_POINTS_CATEGORY}>{SpecialEventType.DOUBLE_POINTS_CATEGORY}</option>
                    </select>
                    <select name="category" value={formData.config.category} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded" required>
                        <option value="">Selecione a categoria afetada</option>
                        {actionCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded" required />
                    <input name="endDate" type="date" value={formData.endDate} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded" required />
                     <div className="flex justify-end pt-4 space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 transition">Cancelar</button>
                         <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Salvar</button>
                     </div>
                 </form>
            </div>
        </div>
    );
};
const MedalCelebrationModal: React.FC<{ medal: Medal; onClose: () => void; }> = ({ medal, onClose }) => {
    useEffect(() => {
        triggerConfetti();
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const medalInfo = MEDAL_TIERS[medal];
    const MedalIcon = medalInfo ? medalIconMap[medalInfo.iconName] : StarIcon;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md text-center animate-scale-in">
                <MedalIcon className="w-32 h-32 mx-auto" />
                <h2 className={`text-3xl font-bold mt-4 ${medalInfo.color}`}>Nova Medalha Conquistada!</h2>
                <p className="text-xl text-slate-300 mt-2">Parabéns, você alcançou a medalha de {medal}!</p>
            </div>
        </div>
    );
};
const WelcomeGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-lg animate-scale-in">
                 <h2 className="text-2xl font-bold mb-4 text-indigo-400">Bem-vindo ao Prisma Points!</h2>
                 <p className="text-slate-300 mb-4">Este é o seu portal para reconhecimento. Registre suas ações, ganhe pontos e troque por prêmios incríveis.</p>
                 <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">Entendi!</button>
            </div>
        </div>
    );
};

const PageContent: React.FC<PageContentProps> = (props) => {
    switch (props.page) {
        case 'dashboard': return <Dashboard {...props} />;
        case 'actions': return <ActionsPage {...props} />;
        case 'missions': return <MissionsPage {...props} />;
        case 'prizes': return <PrizesPage {...props} />;
        case 'history': return <HistoryPage {...props} />;
        case 'leaderboard': return <LeaderboardPage {...props} />;
        case 'admin': return <AdminPage {...props} />;
        default: return <Dashboard {...props} />;
    }
};

const AdminPage: React.FC<PageContentProps> = (props) => {
    const [adminTab, setAdminTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Visão Geral' },
        { id: 'validations', label: 'Validações' },
        { id: 'redemptions', label: 'Resgates' },
        { id: 'users', label: 'Usuários' },
        { id: 'actions', label: 'Ações' },
        { id: 'prizes', label: 'Prêmios' },
        { id: 'missions', label: 'Missões' },
        { id: 'events', label: 'Eventos' },
        { id: 'settings', label: 'Configurações' },
    ];
    
    const renderContent = () => {
        switch (adminTab) {
            case 'overview': return <AdminOverviewComponent {...props} onNavigate={setAdminTab} />;
            case 'validations': return <ValidationsComponent {...props} />;
            case 'redemptions': return <RedemptionsComponent {...props} />;
            case 'users': return <ManageUsersComponent {...props} />;
            case 'actions': return <ManageActionsComponent {...props} />;
            case 'prizes': return <ManagePrizesComponent {...props} />;
            case 'missions': return <ManageMissionsComponent {...props} />;
            case 'events': return <ManageEventsComponent {...props} />;
            case 'settings': return <SettingsComponent {...props} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Painel de Administração</h1>
            <div className="flex border-b border-slate-700 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setAdminTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex-shrink-0 ${adminTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="mt-6 animate-fade-in">
                {renderContent()}
            </div>
        </div>
    );
};


const App: React.FC = () => {
    // STATE MANAGEMENT
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [page, setPage] = useState<Page>('dashboard');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Mock Database State - now initialized from localStorage
    const [users, setUsers] = useState<User[]>(() => getFromLocalStorage('prisma-points-users', USERS));
    const [actions, setActions] = useState<Action[]>(() => getFromLocalStorage('prisma-points-actions', ACTIONS));
    const [prizes, setPrizes] = useState<Prize[]>(() => getFromLocalStorage('prisma-points-prizes', PRIZES));
    const [loggedActions, setLoggedActions] = useState<LoggedAction[]>(() => getFromLocalStorage('prisma-points-logged-actions', LOGGED_ACTIONS));
    const [redemptions, setRedemptions] = useState<Redemption[]>(() => getFromLocalStorage('prisma-points-redemptions', REDEMPTIONS));
    const [notifications, setNotifications] = useState<AppNotification[]>(() => getFromLocalStorage('prisma-points-notifications', NOTIFICATIONS));
    const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => getFromLocalStorage('prisma-points-admin-settings', INITIAL_ADMIN_SETTINGS));
    const [missions, setMissions] = useState<Mission[]>(() => getFromLocalStorage('prisma-points-missions', MISSIONS));
    const [userMissionProgress, setUserMissionProgress] = useState<UserMissionProgress[]>(() => getFromLocalStorage('prisma-points-user-mission-progress', USER_MISSION_PROGRESS));
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>(() => getFromLocalStorage('prisma-points-special-events', SPECIAL_EVENTS));

    
    // UI State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<Action | null>(null);
    const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
    const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
    const [editingMission, setEditingMission] = useState<Mission | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
    const [pointsJustUpdated, setPointsJustUpdated] = useState(false);
    const [medalCelebration, setMedalCelebration] = useState<Medal | null>(null);
    const [exitingLog, setExitingLog] = useState<{ id: number; status: 'VALIDATED' | 'REJECTED' } | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(() => !getFromLocalStorage('prisma-points-guide-dismissed', false));

    
    // Refs for click-outside functionality
    const notificationsPanelRef = useRef<HTMLDivElement>(null);
    const notificationsToggleRef = useRef<HTMLButtonElement>(null);

    // Persist state to localStorage on change
    useEffect(() => { saveToLocalStorage('prisma-points-users', users); }, [users]);
    useEffect(() => { saveToLocalStorage('prisma-points-actions', actions); }, [actions]);
    useEffect(() => { saveToLocalStorage('prisma-points-prizes', prizes); }, [prizes]);
    useEffect(() => { saveToLocalStorage('prisma-points-logged-actions', loggedActions); }, [loggedActions]);
    useEffect(() => { saveToLocalStorage('prisma-points-redemptions', redemptions); }, [redemptions]);
    useEffect(() => { saveToLocalStorage('prisma-points-notifications', notifications); }, [notifications]);
    useEffect(() => { saveToLocalStorage('prisma-points-admin-settings', adminSettings); }, [adminSettings]);
    useEffect(() => { saveToLocalStorage('prisma-points-missions', missions); }, [missions]);
    useEffect(() => { saveToLocalStorage('prisma-points-user-mission-progress', userMissionProgress); }, [userMissionProgress]);
    useEffect(() => { saveToLocalStorage('prisma-points-special-events', specialEvents); }, [specialEvents]);


    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    };

    // AUTHENTICATION LOGIC
    const handleLogin = (username: string, password: string): boolean => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            setCurrentUser(user);
            setPage('dashboard');
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };
    
    const updateUserPoints = (userId: number, pointChange: number) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, points: u.points + pointChange } : u));
        if(currentUser && currentUser.id === userId) {
            setCurrentUser(prev => prev ? {...prev, points: prev.points + pointChange} : null);
            setPointsJustUpdated(true);
            setTimeout(() => setPointsJustUpdated(false), 1000); // Duration of the glow animation
        }
    };

    const handleChangePassword = (currentPassword: string, newPassword: string) => {
        if (!currentUser) return;
        
        if (currentUser.password !== currentPassword) {
            showNotification('A senha atual está incorreta.', 'error');
            return;
        }
    
        if (!newPassword.trim()) {
            showNotification('A nova senha não pode estar em branco.', 'error');
            return;
        }
        
        const updatedUser = { ...currentUser, password: newPassword };
    
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
        
        showNotification('Senha alterada com sucesso!');
        setIsProfileModalOpen(false);
    };


    // DATA MANIPULATION LOGIC
    const handleLogAction = (actionId: number, notes: string) => {
        if (!currentUser) return;
        const newLog: LoggedAction = {
            id: Date.now(),
            userId: currentUser.id,
            actionId,
            month: getCurrentMonth(),
            notes,
            status: Status.PENDING_VALIDATION,
        };
        setLoggedActions(prev => [...prev, newLog]);
        showNotification('Ação registrada! Aguardando validação.');
    };

    const handleRedeemPrize = (prize: Prize) => {
        if (!currentUser || currentUser.points < prize.cost) return;
        const newRedemption: Redemption = {
            id: Date.now(),
            userId: currentUser.id,
            prizeId: prize.id,
            requestDate: new Date().toISOString().split('T')[0],
            status: Status.PENDING_APPROVAL,
        };
        setRedemptions(prev => [...prev, newRedemption]);
        updateUserPoints(currentUser.id, -prize.cost);
        showNotification('Pedido de resgate enviado e pontos pré-debitados!');
        triggerConfetti();
    };
    
    const handleSendNotification = useCallback((recipientId: number | 'all', message: string) => {
        if (!currentUser) return;
        
        const newNotification: AppNotification = {
            id: Date.now(),
            senderId: currentUser.id,
            recipientId,
            message,
            timestamp: new Date().toISOString(),
            read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        if (recipientId !== currentUser.id) {
             showNotification('Notificação enviada com sucesso!');
        }
    }, [currentUser]);

    const getBonusPointsForAction = useCallback((action: Action) => {
        const today = getToday();
        let bonusPoints = 0;

        const activeEvent = specialEvents.find(event => today >= event.startDate && today <= event.endDate);

        if (activeEvent) {
            if (activeEvent.type === SpecialEventType.DOUBLE_POINTS_CATEGORY && activeEvent.config.category === action.category) {
                bonusPoints = action.points; // Bonus is equal to the original points (total = 2x)
            }
        }
        return bonusPoints;
    }, [specialEvents]);

    const handleAdminLogActionForUser = (userId: number, actionId: number, notes: string) => {
        if (!currentUser || currentUser.role !== Role.ADMIN) {
            showNotification('Apenas administradores podem executar esta ação.', 'error');
            return;
        }

        const action = actions.find(a => a.id === actionId);
        if (!action) {
            showNotification('Ação não encontrada.', 'error');
            return;
        }

        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) {
            showNotification('Usuário não encontrado.', 'error');
            return;
        }

        const newLog: LoggedAction = {
            id: Date.now(),
            userId: userId,
            actionId: actionId,
            notes,
            month: getCurrentMonth(),
            status: Status.VALIDATED,
            validationDate: new Date().toISOString().split('T')[0]
        };
        
        const bonusPoints = getBonusPointsForAction(action);
        const totalPoints = action.points + bonusPoints;

        setLoggedActions(prev => [...prev, newLog]);
        updateUserPoints(userId, totalPoints);
        updateMissionProgress(userId, action);

        const bonusText = bonusPoints > 0 ? ` (+${bonusPoints} de bônus do evento!)` : '';
        handleSendNotification(userId, `O administrador ${currentUser.name} registrou a ação "${action.description}" para você, adicionando ${totalPoints} pontos${bonusText}.`);
        
        showNotification(`Ação registrada para ${userToUpdate.name} com sucesso!`);
    };

    const calculateMonthlyPoints = useCallback((userId: number, month: string, currentLoggedActions: LoggedAction[]) => {
        return currentLoggedActions
            .filter(log => log.userId === userId && log.month === month && log.status === Status.VALIDATED)
            .reduce((sum, log) => {
                const action = actions.find(a => a.id === log.actionId);
                return sum + (action?.points || 0);
            }, 0);
    }, [actions]);

    // Mission Helpers
    const getMissionPeriod = (type: MissionType): string => {
        const now = new Date();
        if (type === MissionType.DAILY) {
            return now.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        if (type === MissionType.WEEKLY) {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
            const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`; // YYYY-Www
        }
        // Monthly
        return now.toISOString().slice(0, 7); // YYYY-MM
    };

    const updateMissionProgress = (userId: number, validatedAction: Action) => {
        const relevantMissions = missions.filter(m =>
            m.isGlobal &&
            m.goal.type === MissionGoalType.LOG_ACTION_CATEGORY &&
            m.goal.category === validatedAction.category
        );

        if (relevantMissions.length === 0) return;

        setUserMissionProgress(prevProgress => {
            const newProgress = [...prevProgress];
            
            relevantMissions.forEach(mission => {
                const period = getMissionPeriod(mission.type);
                let progressEntry = newProgress.find(p =>
                    p.userId === userId &&
                    p.missionId === mission.id &&
                    p.period === period
                );

                if (!progressEntry) {
                    progressEntry = {
                        userId,
                        missionId: mission.id,
                        progress: 0,
                        status: UserMissionProgressStatus.IN_PROGRESS,
                        period,
                    };
                    newProgress.push(progressEntry);
                }

                if (progressEntry.status === UserMissionProgressStatus.IN_PROGRESS) {
                    progressEntry.progress += 1;
                    if (progressEntry.progress >= mission.goal.count) {
                        progressEntry.status = UserMissionProgressStatus.COMPLETED;
                        handleSendNotification(userId, `Missão concluída: "${mission.title}"! Resgate sua recompensa na página de Missões.`);
                    }
                }
            });

            return newProgress;
        });
    };

    const handleValidateAction = (logId: number, newStatus: Status.VALIDATED | Status.REJECTED) => {
        const log = loggedActions.find(l => l.id === logId);
        if (!log) return;
        
        setExitingLog({ id: logId, status: newStatus });

        setTimeout(() => {
            if (newStatus === Status.VALIDATED) {
                const action = actions.find(a => a.id === log.actionId);
                if (!action) return;

                const oldMonthlyPoints = calculateMonthlyPoints(log.userId, log.month, loggedActions);
                const oldMedal = getMedalForPoints(oldMonthlyPoints);
                
                const bonusPoints = getBonusPointsForAction(action);
                const totalPoints = action.points + bonusPoints;

                updateUserPoints(log.userId, totalPoints);
                updateMissionProgress(log.userId, action);

                setLoggedActions(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus, validationDate: new Date().toISOString().split('T')[0] } : l));
                
                const newMonthlyPoints = oldMonthlyPoints + action.points; 
                const newMedal = getMedalForPoints(newMonthlyPoints);

                const bonusText = bonusPoints > 0 ? ` (+${bonusPoints} de bônus do evento!)` : '';
                showNotification(`Ação validada! +${totalPoints} pontos${bonusText} creditados!`);
                
                if (newMedal !== oldMedal && MEDAL_TIERS[newMedal].points > MEDAL_TIERS[oldMedal].points) {
                    handleSendNotification(log.userId, `Parabéns! Você alcançou a medalha de ${newMedal} este mês!`);
                    setMedalCelebration(newMedal);
                }
            } else { // REJECTED
                setLoggedActions(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus, validationDate: new Date().toISOString().split('T')[0] } : l));
                showNotification('Ação rejeitada.');
            }
             setExitingLog(null);
        }, 500);
    };

    const handleBulkValidate = (userId: number, status: Status.VALIDATED | Status.REJECTED) => {
        const user = users.find(u => u.id === userId);
        if(!user) return;

        const logsToUpdate = loggedActions.filter(l => l.userId === userId && l.status === Status.PENDING_VALIDATION);
        if (logsToUpdate.length === 0) {
            showNotification(`Nenhuma ação pendente para ${user.name}.`, 'error');
            return;
        }

        if(!window.confirm(`Tem certeza que deseja ${status === Status.VALIDATED ? 'validar' : 'rejeitar'} todas as ${logsToUpdate.length} ações pendentes de ${user.name}?`)) {
            return;
        }

        const logIdsToUpdate = logsToUpdate.map(l => l.id);
        
        let totalPointsToAdd = 0;
        let finalMedal = getMedalForPoints(calculateMonthlyPoints(userId, getCurrentMonth(), loggedActions));

        if (status === Status.VALIDATED) {
            logsToUpdate.forEach(log => {
                const action = actions.find(a => a.id === log.actionId);
                if(action) {
                    const bonusPoints = getBonusPointsForAction(action);
                    totalPointsToAdd += action.points + bonusPoints;
                    updateMissionProgress(userId, action);
                }
            });

            const oldPoints = calculateMonthlyPoints(userId, getCurrentMonth(), loggedActions);
            const basePointsToAdd = logsToUpdate.reduce((sum, log) => sum + (actions.find(a => a.id === log.actionId)?.points || 0), 0);
            finalMedal = getMedalForPoints(oldPoints + basePointsToAdd);
        }

        setLoggedActions(prev => prev.map(l => logIdsToUpdate.includes(l.id) ? { ...l, status, validationDate: new Date().toISOString().split('T')[0] } : l));

        if(totalPointsToAdd > 0) {
            updateUserPoints(userId, totalPointsToAdd);
        }

        showNotification(`Ações em massa para ${user.name} foram processadas.`);
        const oldMedal = getMedalForPoints(calculateMonthlyPoints(userId, getCurrentMonth(), loggedActions.filter(l => !logIdsToUpdate.includes(l.id))));
        if (finalMedal !== oldMedal && MEDAL_TIERS[finalMedal].points > MEDAL_TIERS[oldMedal].points) {
            handleSendNotification(userId, `Parabéns! Você alcançou a medalha de ${finalMedal} este mês!`);
            setMedalCelebration(finalMedal);
        }
    }


    const handleApproveRedemption = (redemptionId: number, newStatus: Status.APPROVED | Status.REFUSED) => {
        const redemption = redemptions.find(r => r.id === redemptionId);
        if (!redemption) return;

        setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status: newStatus, approvalDate: new Date().toISOString().split('T')[0] } : r));

        if (newStatus === Status.APPROVED) {
            showNotification('Resgate aprovado!');
        } else {
            const prize = prizes.find(p => p.id === redemption.prizeId);
            if (prize) {
                // Return points if refused
                updateUserPoints(redemption.userId, prize.cost);
                showNotification('Resgate recusado e pontos estornados.');
            } else {
                showNotification('Resgate recusado.');
            }
        }
    };
    
    const handleToggleNotifications = () => {
        setIsNotificationsOpen(prev => !prev);
        if (!isNotificationsOpen) {
            setTimeout(() => {
                 setNotifications(prev =>
                    prev.map(n =>
                        (n.recipientId === currentUser?.id || n.recipientId === 'all') && !n.read
                            ? { ...n, read: true }
                            : n
                    )
                );
            }, 500)
        }
    };
    
    // ADMIN USER CRUD
    const handleSaveUser = (userData: Omit<User, 'id' | 'points' | 'password'> & { id?: number; password?: string }) => {
        if (userData.id) {
            setUsers(prev => prev.map(u => u.id === userData.id ? { ...u, ...userData, password: userData.password || u.password } : u));
            showNotification('Usuário atualizado com sucesso!');
        } else {
            const newUser: User = {
                id: Date.now(),
                name: userData.name,
                username: userData.username,
                password: userData.password,
                role: userData.role,
                points: 0,
            };
            setUsers(prev => [...prev, newUser]);
            showNotification(`Usuário criado! Login: ${newUser.username} | Senha: ${newUser.password}`);
        }
        setEditingUser(null);
        setIsUserModalOpen(false);
    };

    const handleDeleteUser = (userId: number) => {
        if (currentUser?.id === userId) {
            showNotification('Você não pode excluir seu próprio usuário.', 'error');
            return;
        }
        if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            showNotification('Usuário excluído com sucesso.');
        }
    };

    // ADMIN ACTION CRUD
    const handleSaveAction = (actionData: Omit<Action, 'id'> & { id?: number }) => {
        if (actionData.id) {
            setActions(prev => prev.map(a => a.id === actionData.id ? { ...a, ...actionData, id: actionData.id } : a));
            showNotification('Ação atualizada com sucesso!');
        } else {
            const newAction: Action = {
                id: Date.now(),
                ...actionData,
            };
            setActions(prev => [...prev, newAction]);
            showNotification('Ação criada com sucesso!');
        }
        setEditingAction(null);
        setIsActionModalOpen(false);
    };

    const handleDeleteAction = (actionId: number) => {
        if (window.confirm('Tem certeza que deseja excluir esta ação?')) {
            setActions(prev => prev.filter(a => a.id !== actionId));
            showNotification('Ação excluída com sucesso.');
        }
    };

    // ADMIN PRIZE CRUD
    const handleSavePrize = (prizeData: Omit<Prize, 'id'> & { id?: number }) => {
        if (prizeData.id) {
            setPrizes(prev => prev.map(p => p.id === prizeData.id ? { ...p, ...prizeData, id: prizeData.id } : p));
            showNotification('Prêmio atualizado com sucesso!');
        } else {
            const newPrize: Prize = {
                id: Date.now(),
                ...prizeData,
            };
            setPrizes(prev => [...prev, newPrize]);
            showNotification('Prêmio criado com sucesso!');
        }
        setEditingPrize(null);
        setIsPrizeModalOpen(false);
    };

    const handleDeletePrize = (prizeId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este prêmio?')) {
            setPrizes(prev => prev.filter(p => p.id !== prizeId));
            showNotification('Prêmio excluído com sucesso.');
        }
    };

    // ADMIN MISSION CRUD
    const handleSaveMission = (missionData: Omit<Mission, 'id'> & { id?: number }) => {
        if (missionData.id) {
            setMissions(prev => prev.map(m => m.id === missionData.id ? { ...m, ...missionData, id: missionData.id } : m));
            showNotification('Missão atualizada com sucesso!');
        } else {
            const newMission: Mission = {
                id: Date.now(),
                ...missionData,
            };
            setMissions(prev => [...prev, newMission]);
            showNotification('Missão criada com sucesso!');
        }
        setEditingMission(null);
        setIsMissionModalOpen(false);
    };

    const handleDeleteMission = (missionId: number) => {
        if (window.confirm('Tem certeza que deseja excluir esta missão?')) {
            setMissions(prev => prev.filter(m => m.id !== missionId));
            showNotification('Missão excluída com sucesso.');
        }
    };

    const handleClaimMissionReward = (missionId: number) => {
        if (!currentUser) return;

        const missionToClaim = missions.find(m => m.id === missionId);
        if (!missionToClaim) return;
        
        const period = getMissionPeriod(missionToClaim.type);
        const progressIndex = userMissionProgress.findIndex(p =>
            p.userId === currentUser.id &&
            p.missionId === missionId &&
            p.period === period &&
            p.status === UserMissionProgressStatus.COMPLETED
        );

        if (progressIndex > -1) {
            const mission = missions.find(m => m.id === missionId);
            if (!mission) return;

            setUserMissionProgress(prev => {
                const newProgress = [...prev];
                newProgress[progressIndex] = { ...newProgress[progressIndex], status: UserMissionProgressStatus.CLAIMED };
                return newProgress;
            });

            updateUserPoints(currentUser.id, mission.rewardPoints);
            showNotification(`Recompensa de ${mission.rewardPoints} pontos resgatada com sucesso!`);
        }
    };

    // ADMIN EVENT CRUD
    const handleSaveEvent = (eventData: Omit<SpecialEvent, 'id'> & { id?: number }) => {
        if (eventData.id) {
            setSpecialEvents(prev => prev.map(e => e.id === eventData.id ? { ...e, ...eventData, id: eventData.id } : e));
            showNotification('Evento atualizado com sucesso!');
        } else {
            const newEvent: SpecialEvent = {
                id: Date.now(),
                ...eventData,
            };
            setSpecialEvents(prev => [...prev, newEvent]);
            showNotification('Evento criado com sucesso!');
        }
        setEditingEvent(null);
        setIsEventModalOpen(false);
    };

    const handleDeleteEvent = (eventId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este evento especial?')) {
            setSpecialEvents(prev => prev.filter(e => e.id !== eventId));
            showNotification('Evento excluído com sucesso.');
        }
    };

    // DERIVED STATE & MEMOIZED VALUES
    const unreadNotificationsCount = useMemo(() => {
        if (!currentUser) return 0;
        return notifications.filter(n => (n.recipientId === currentUser.id || n.recipientId === 'all') && !n.read).length;
    }, [notifications, currentUser]);

    const groupedActions = useMemo(() => {
        return actions.reduce((acc, action) => {
            acc[action.category] = [...(acc[action.category] || []), action];
            return acc;
        }, {} as { [key: string]: Action[] });
    }, [actions]);

    const groupedPrizes = useMemo(() => {
        return prizes.reduce((acc, prize) => {
            acc[prize.category] = [...(acc[prize.category] || []), prize];
            return acc;
        }, {} as { [key: string]: Prize[] });
    }, [prizes]);
    
    const userHistory = useMemo((): HistoryEntry[] => {
        if (!currentUser) return [];
        
        const months = new Set<string>();
        loggedActions.filter(l => l.userId === currentUser.id).forEach(log => months.add(log.month));
        redemptions.filter(r => r.userId === currentUser.id).forEach(red => months.add(new Date(red.requestDate).toISOString().slice(0, 7)));

        const sortedMonths = Array.from(months).sort();

        return sortedMonths.map(month => {
            const pontosGanhos = loggedActions
                .filter(log => log.userId === currentUser.id && log.month === month && log.status === Status.VALIDATED)
                .reduce((total, log) => {
                    const action = actions.find(a => a.id === log.actionId);
                    return total + (action?.points || 0);
                }, 0);

            const pontosResgatados = redemptions
                .filter(red => red.userId === currentUser.id && new Date(red.requestDate).toISOString().slice(0, 7) === month && red.status === Status.APPROVED)
                .reduce((total, red) => {
                    const prize = prizes.find(p => p.id === red.prizeId);
                    return total + (prize?.cost || 0);
                }, 0);
                
            const monthlyMedal = getMedalForPoints(pontosGanhos);

            return { month, pontosGanhos, pontosResgatados, medal: monthlyMedal };
        });
    }, [currentUser, loggedActions, redemptions, actions, prizes]);
    
    const leaderboardData = useMemo(() => {
        const currentMonth = getCurrentMonth();
        return users
            .filter(u => u.role === Role.ANALYST)
            .map(user => {
                const monthlyPoints = calculateMonthlyPoints(user.id, currentMonth, loggedActions);
                return {
                    ...user,
                    monthlyPoints: monthlyPoints,
                    medal: getMedalForPoints(monthlyPoints),
                };
            })
            .sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [users, loggedActions, calculateMonthlyPoints]);

    const isActionLoggingLocked = adminSettings.actionsLockedUntil ? getToday() > adminSettings.actionsLockedUntil : false;

    const userVisibleMissions = useMemo(() => {
        if (!currentUser) return [];
        return missions
            .filter(m => m.isGlobal)
            .map(mission => {
                const period = getMissionPeriod(mission.type);
                const progress = userMissionProgress.find(p => p.userId === currentUser.id && p.missionId === mission.id && p.period === period) 
                                || { userId: currentUser.id, missionId: mission.id, progress: 0, status: UserMissionProgressStatus.IN_PROGRESS, period };
                return { ...mission, ...progress };
            });
    }, [currentUser, missions, userMissionProgress]);
    
    const activeSpecialEvent = useMemo(() => {
        const today = getToday();
        return specialEvents.find(event => today >= event.startDate && today <= event.endDate);
    }, [specialEvents]);

    // UI Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isNotificationsOpen && notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target as Node) && !notificationsToggleRef.current?.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationsOpen]);

    const animatedPoints = useAnimatedCounter(currentUser?.points ?? 0);

    // RENDER LOGIC
    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} showNotification={showNotification} />;
    }

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">
            <Sidebar user={currentUser} currentPage={page} setPage={setPage} onLogout={handleLogout} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={currentUser} 
                    points={animatedPoints}
                    pointsJustUpdated={pointsJustUpdated}
                    unreadCount={unreadNotificationsCount} 
                    onToggleNotifications={handleToggleNotifications}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    notificationsToggleRef={notificationsToggleRef}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-900">
                    <PageContent 
                        page={page} 
                        currentUser={currentUser}
                        actions={actions}
                        groupedActions={groupedActions}
                        prizes={prizes}
                        groupedPrizes={groupedPrizes}
                        users={users}
                        loggedActions={loggedActions}
                        redemptions={redemptions}
                        onLogAction={handleLogAction}
                        onRedeemPrize={handleRedeemPrize}
                        historyData={userHistory}
                        leaderboardData={leaderboardData}
                        onValidateAction={handleValidateAction}
                        onApproveRedemption={handleApproveRedemption}
                        isActionLoggingLocked={isActionLoggingLocked}
                        isPrizesLocked={adminSettings.prizesLocked}
                        adminSettings={adminSettings}
                        onSettingsChange={setAdminSettings}
                        onSaveUser={(user) => { setEditingUser(user); setIsUserModalOpen(true); }}
                        onDeleteUser={handleDeleteUser}
                        onSaveAction={(action) => { setEditingAction(action); setIsActionModalOpen(true); }}
                        onDeleteAction={handleDeleteAction}
                        onSavePrize={(prize) => { setEditingPrize(prize); setIsPrizeModalOpen(true); }}
                        onDeletePrize={handleDeletePrize}
                        onSendNotification={handleSendNotification}
                        onBulkValidate={handleBulkValidate}
                        onAdminLogAction={handleAdminLogActionForUser}
                        missions={userVisibleMissions}
                        allMissions={missions}
                        onClaimMissionReward={handleClaimMissionReward}
                        onSaveMission={(mission) => { setEditingMission(mission); setIsMissionModalOpen(true); }}
                        onDeleteMission={handleDeleteMission}
                        specialEvents={specialEvents}
                        onSaveEvent={(event) => { setEditingEvent(event); setIsEventModalOpen(true); }}
                        onDeleteEvent={handleDeleteEvent}
                        activeSpecialEvent={activeSpecialEvent}
                        getBonusPointsForAction={getBonusPointsForAction}
                        exitingLog={exitingLog}
                    />
                </main>
            </div>
            
            <ToastContainer toasts={toasts} />
            
            {isNotificationsOpen && (
                <NotificationsPanel 
                    notifications={notifications.filter(n => n.recipientId === currentUser.id || n.recipientId === 'all')}
                    onClose={() => setIsNotificationsOpen(false)}
                    users={users}
                    panelRef={notificationsPanelRef}
                />
            )}
            
            {isProfileModalOpen && (
                <ProfileModal
                    user={currentUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onChangePassword={handleChangePassword}
                />
            )}
             {isUserModalOpen && (
                <UserFormModal 
                    user={editingUser} 
                    onSave={handleSaveUser} 
                    onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }} 
                />
            )}
            {isActionModalOpen && (
                <ActionFormModal 
                    action={editingAction} 
                    onSave={handleSaveAction} 
                    onClose={() => { setIsActionModalOpen(false); setEditingAction(null); }} 
                />
            )}
            {isPrizeModalOpen && (
                <PrizeFormModal 
                    prize={editingPrize} 
                    onSave={handleSavePrize} 
                    onClose={() => { setIsPrizeModalOpen(false); setEditingPrize(null); }} 
                />
            )}
            {isMissionModalOpen && (
                <MissionFormModal
                    mission={editingMission}
                    onSave={handleSaveMission}
                    onClose={() => { setIsMissionModalOpen(false); setEditingMission(null); }}
                />
            )}
            {isEventModalOpen && (
                <EventFormModal
                    event={editingEvent}
                    onSave={handleSaveEvent}
                    onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
                    actionCategories={[...new Set(actions.map(a => a.category))]}
                />
            )}
            
             {medalCelebration && (
                <MedalCelebrationModal
                    medal={medalCelebration}
                    onClose={() => setMedalCelebration(null)}
                />
            )}
            {isGuideOpen && (
                <WelcomeGuideModal onClose={() => {
                    setIsGuideOpen(false);
                    saveToLocalStorage('prisma-points-guide-dismissed', true);
                }} />
            )}
        </div>
    );
};

export default App;