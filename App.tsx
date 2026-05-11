import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Action, Prize, User, Role, Status, LoggedAction, Redemption, HistoryEntry, AppNotification, AdminSettings, Medal, Mission, UserMissionProgress, UserMissionProgressStatus, MissionType, MissionGoalType, MissionGoal, SpecialEvent, SpecialEventType } from './types';
import { USERS, ACTIONS, PRIZES, LOGGED_ACTIONS, REDEMPTIONS, NOTIFICATIONS, INITIAL_ADMIN_SETTINGS, MEDAL_TIERS, MISSIONS, USER_MISSION_PROGRESS, SPECIAL_EVENTS, APP_VERSION } from './constants';
import { HomeIcon, CheckCircleIcon, GiftIcon, ChartBarIcon, CogIcon, LogoutIcon, StarIcon, PencilIcon, TrashIcon, PlusCircleIcon, CheckIcon, XCircleIcon, TrophyIcon, BellIcon, TrendingUpIcon, PrizeIcon, DownloadIcon, UserCircleIcon, ClipboardListIcon, SparklesIcon, BronzeMedalIcon, SilverMedalIcon, GoldMedalIcon, DiamondMedalIcon, UsersIcon, HeartIcon, ZapIcon, ClockIcon, AlertTriangleIcon, HistoryIcon, CalendarIcon, TruckIcon, PackageIcon, ActivityIcon, DiamondIcon, ArrowRightIcon, TargetIcon, AlertCircleIcon } from './components/icons';
import HistoryChart from './components/HistoryChart';
import { exportToExcel, exportToPDF } from './lib/exportUtils';
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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


type Page = 'dashboard' | 'actions' | 'missions' | 'prizes' | 'history' | 'leaderboard' | 'admin' | 'admin_prizes';

// Helper function to get the current month in YYYY-MM format
const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

// Helper function to get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 2);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

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

const Sidebar: React.FC<{ 
    user: User; 
    currentPage: Page; 
    setPage: (page: Page) => void; 
    onLogout: () => void; 
    prizes: Prize[];
    onToggleWishlist: (prizeId: number) => void;
}> = ({ user, currentPage, setPage, onLogout, prizes, onToggleWishlist }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { id: 'actions', label: 'Registrar Ação', icon: CheckCircleIcon },
        { id: 'missions', label: 'Missões', icon: SparklesIcon},
        ...(user.role === Role.ADMIN 
            ? [{ id: 'admin_prizes', label: 'Editar Loja de Prêmios', icon: CogIcon }]
            : [{ id: 'prizes', label: 'Resgatar Prêmios', icon: GiftIcon }]
        ),
        { id: 'history', label: 'Meu Histórico', icon: ChartBarIcon },
        { id: 'leaderboard', label: 'Ranking', icon: TrophyIcon },
    ];

    const wishlistPrizes = useMemo(() => {
        const idList = user.wishlist || [];
        return prizes.filter(p => idList.includes(p.id));
    }, [user.wishlist, prizes]);

    const availableToWishlist = useMemo(() => {
        const idList = user.wishlist || [];
        return prizes.filter(p => !idList.includes(p.id)).slice(0, 10); // Limit dropdown size
    }, [user.wishlist, prizes]);

    return (
        <aside className="w-16 md:w-64 bg-slate-800 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-center md:justify-start md:px-6 h-20 border-b border-slate-700">
                 <StarIcon className="h-8 w-8 text-indigo-400" />
                 <span className="hidden md:block ml-3 text-2xl font-bold text-slate-100">Prisma</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <nav className="px-2 md:px-4 py-4 space-y-2">
                    <div className="hidden md:block px-2 mb-2">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Navegação</p>
                    </div>
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setPage(item.id as Page)}
                            className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                            <item.icon className="h-5 w-5" />
                            <span className="hidden md:block ml-4 font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                    {user.role === Role.ADMIN && (
                        <button onClick={() => setPage('admin')}
                            className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentPage === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                            <CogIcon className="h-5 w-5" />
                            <span className="hidden md:block ml-4 font-medium text-sm">Admin</span>
                        </button>
                    )}
                </nav>

                {/* Wishlist Sidebar Section */}
                <div className="hidden md:block px-4 py-6 border-t border-slate-700/50">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Lista de Desejos</p>
                        <span className="text-[10px] text-slate-500 font-bold">{wishlistPrizes.length}/3</span>
                    </div>

                    {user.wishlist?.length < 3 && (
                        <div className="px-2 mb-4">
                            <select 
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onToggleWishlist(Number(e.target.value));
                                        e.target.value = "";
                                    }
                                }}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-md px-2 py-1.5 text-[10px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value=""
                            >
                                <option value="" disabled>+ Adicionar desejo</option>
                                {availableToWishlist.map(p => (
                                    <option key={p.id} value={p.id}>{p.description}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-1">
                        {wishlistPrizes.map(prize => {
                            const progress = Math.min((user.points / prize.cost) * 100, 100);
                            return (
                                <div key={prize.id} className="group relative p-2 rounded-lg hover:bg-slate-700/30 transition-all cursor-pointer" onClick={() => setPage('prizes')}>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-slate-300 truncate w-32">{prize.description}</p>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onToggleWishlist(prize.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-1">
                                        <div 
                                            className={`h-1 rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {wishlistPrizes.length === 0 && (
                            <p className="text-[10px] text-slate-600 italic px-2">Nenhum item fixado</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="px-2 md:px-4 py-4 border-t border-slate-700">
                 <button onClick={onLogout} className="w-full flex items-center justify-center md:justify-start p-3 rounded-lg text-slate-400 hover:bg-red-600 hover:text-white transition-colors">
                    <LogoutIcon className="h-6 w-6" />
                    <span className="hidden md:block ml-4 font-medium text-sm">Sair</span>
                </button>
            </div>
        </aside>
    );
};

const Header: React.FC<{ user: User, points: number, pointsJustUpdated: boolean, unreadCount: number, onToggleNotifications: () => void, onOpenProfile: () => void, notificationsToggleRef: React.RefObject<HTMLButtonElement>, theme: 'light' | 'dark', onToggleTheme: () => void, onOpenSearch: () => void }> = ({ user, points, pointsJustUpdated, unreadCount, onToggleNotifications, onOpenProfile, notificationsToggleRef, theme, onToggleTheme, onOpenSearch }) => {
    return (
        <header className="flex items-center justify-between h-20 px-8 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 dark:bg-slate-800/50 dark:border-slate-700 light:bg-white light:border-slate-200">
             <div className="flex items-center space-x-4">
                 <h1 className="text-xl font-semibold text-slate-100 light:text-slate-900">Bem-vindo, {user.name.split(' ')[0]}!</h1>
                 <button 
                    onClick={onOpenSearch}
                    className="hidden md:flex items-center px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition light:bg-slate-100 light:border-slate-300 light:text-slate-500"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Busca rápida... <span className="ml-2 text-xs opacity-50 px-1 border border-slate-500 rounded">⌘K</span>
                </button>
             </div>
             <div className="flex items-center space-x-6">
                <button onClick={onToggleTheme} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition light:text-slate-500 light:hover:bg-slate-200">
                    {theme === 'dark' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                </button>
                <div className={`flex items-center space-x-2 bg-slate-700 px-4 py-2 rounded-full light:bg-slate-100 ${pointsJustUpdated ? 'animate-glow' : ''}`}>
                    <StarIcon className="h-6 w-6 text-yellow-500"/>
                    <span className="font-bold text-lg text-white light:text-slate-900">{points}</span>
                </div>
                <button ref={notificationsToggleRef} onClick={onToggleNotifications} className="relative text-slate-400 hover:text-white transition-colors light:text-slate-500 light:hover:text-slate-900">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{unreadCount}</span>}
                </button>
                <button onClick={onOpenProfile} className="text-slate-400 hover:text-white transition-colors light:text-slate-500 light:hover:text-slate-900">
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
    setPage: (page: Page) => void;
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
    onAdminLogAction: (userId: number, actionId: number, notes: string, justification?: string) => void;
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
    onToggleWishlist: (prizeId: number) => void;
    onSendPeerRecognition: (recipientId: number, message: string) => void;
    peerRecognitions: PeerRecognition[];
    onBulkImport: (data: { type: 'actions' | 'redemptions', items: any[] }) => void;
};

const Dashboard: React.FC<PageContentProps> = ({ currentUser, historyData, leaderboardData, activeSpecialEvent, loggedActions, actions, prizes, peerRecognitions, onSendPeerRecognition, onToggleWishlist, users, setPage }) => {
    const currentMonth = getCurrentMonth();
    const currentMonthData = historyData.find(h => h.month === currentMonth);
    const monthlyPoints = currentMonthData?.pontosGanhos || 0;
    const { nextMedal, pointsNeeded, progress } = getNextMedalInfo(monthlyPoints);
    const currentMedal = getMedalForPoints(monthlyPoints);
    const currentMedalInfo = MEDAL_TIERS[currentMedal];
    const CurrentMedalIcon = currentMedalInfo ? medalIconMap[currentMedalInfo.iconName] : StarIcon;
    const nextMedalTier = nextMedal ? MEDAL_TIERS[nextMedal] : null;

    // Wishlist dropdown management
    const availablePrizes = useMemo(() => {
        const currentWishlist = currentUser.wishlist || [];
        return prizes.filter(p => !currentWishlist.includes(p.id));
    }, [prizes, currentUser.wishlist]);

    // Pillar breakdown
    const pilarData = useMemo(() => {
        const counts: Record<string, number> = {};
        loggedActions
            .filter(l => l.userId === currentUser.id && l.month === currentMonth && l.status === Status.VALIDATED)
            .forEach(l => {
                const action = actions.find(a => a.id === l.actionId);
                if (action) {
                    const points = l.points !== undefined ? l.points : action.points;
                    counts[action.category] = (counts[action.category] || 0) + points;
                }
            });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [loggedActions, currentUser, actions, currentMonth]);

    // level Forecasting...
    const forecastMedal = useMemo(() => {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const currentDay = today.getDate();
        const pace = monthlyPoints / currentDay;
        const projectedPoints = pace * daysInMonth;
        return {
            projectedPoints: Math.round(projectedPoints),
            medal: getMedalForPoints(projectedPoints)
        };
    }, [monthlyPoints]);

    const rejectedActions = useMemo(() => {
        return loggedActions.filter(l => l.userId === currentUser.id && l.status === Status.REJECTED && l.rejectionReason);
    }, [loggedActions, currentUser.id]);

    const wishlistPrizes = useMemo(() => {
        if (!currentUser.wishlist || currentUser.wishlist.length === 0) return [];
        return prizes.filter(p => currentUser.wishlist?.includes(p.id));
    }, [prizes, currentUser.wishlist]);

    const [peerRecognitionMessage, setPeerRecognitionMessage] = useState('');
    const [peerRecipientId, setPeerRecipientId] = useState<number | ''>('');

    const handlePeerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!peerRecipientId || !peerRecognitionMessage.trim()) return;
        onSendPeerRecognition(Number(peerRecipientId), peerRecognitionMessage);
        setPeerRecognitionMessage('');
        setPeerRecipientId('');
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-100 light:text-slate-900">Dashboard</h1>
                {currentUser.lastActionDate === getToday() && (
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-full border border-yellow-500/20">
                        Limite de 1 ação/dia atingido
                    </span>
                )}
            </div>
             {activeSpecialEvent && (
                <div className="bg-yellow-400/10 border border-yellow-400 text-yellow-300 px-4 py-3 rounded-lg relative animate-fade-in" role="alert">
                    <strong className="font-bold">Evento Especial Ativo!</strong>
                    <span className="block sm:inline ml-2">{activeSpecialEvent.name}: {activeSpecialEvent.description}</span>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Medal Progress Card */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in light:bg-white light:border light:border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-semibold text-indigo-400">Progresso Mensal</h2>
                            <div className="text-right px-3 py-1 bg-slate-700/50 rounded-lg light:bg-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Previsão Final do Mês</p>
                                <p className="text-sm font-bold text-slate-200 light:text-indigo-600">Medalha de {forecastMedal.medal}</p>
                                <p className="text-[10px] text-slate-500">Proj: {forecastMedal.projectedPoints} pts</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            <CurrentMedalIcon className="w-20 h-20"/>
                            <div className="flex-1">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-slate-300 font-medium light:text-slate-600">{currentMedal} ({monthlyPoints} pts)</span>
                                    {nextMedal && (
                                        <span className={`text-sm font-semibold ${nextMedalTier?.color}`}>
                                            Próxima: {nextMedal} ({nextMedalTier?.points} pts)
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-4 light:bg-slate-100">
                                    <div className={`${MEDAL_TIERS[currentMedal].progressColor} h-4 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]`} style={{ width: `${progress}%` }}></div>
                                </div>
                                {nextMedal && <p className="text-right text-slate-400 mt-1 text-sm">Faltam {pointsNeeded} pontos para a próxima medalha!</p>}
                                {!nextMedal && <p className="text-right text-green-400 mt-1 text-sm font-semibold">Você atingiu a medalha máxima!</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Wishlist Box */}
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg light:bg-white light:border light:border-slate-200">
                            <h3 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center justify-between">
                                <span className="flex items-center">
                                    <HeartIcon className="w-5 h-5 mr-2 text-red-400" />
                                    Lista de Desejos
                                </span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-black bg-slate-700 px-2 py-0.5 rounded-full text-slate-400">
                                        {wishlistPrizes.length}/3
                                    </span>
                                </div>
                            </h3>

                            {currentUser.wishlist?.length < 3 && availablePrizes.length > 0 && (
                                <div className="mb-6">
                                    <label className="text-[10px] text-slate-500 font-black uppercase mb-1 block">Adicionar à lista</label>
                                    <select 
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                onToggleWishlist(Number(e.target.value));
                                                e.target.value = "";
                                            }
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value=""
                                    >
                                        <option value="" disabled>Selecione um prêmio...</option>
                                        {availablePrizes.map(p => (
                                            <option key={p.id} value={p.id}>{p.description} ({p.cost} pts)</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {wishlistPrizes.length > 0 ? (
                                <div className="space-y-4">
                                    {wishlistPrizes.map(prize => {
                                        const needed = Math.max(0, prize.cost - currentUser.points);
                                        const wishlistProgress = Math.min((currentUser.points / prize.cost) * 100, 100);
                                        return (
                                            <div key={prize.id} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-200 light:text-slate-800 truncate block">{prize.description}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">{prize.cost} pts</span>
                                                </div>
                                                <div className="w-full bg-slate-700 rounded-full h-2 light:bg-slate-100">
                                                    <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${wishlistProgress}%` }}></div>
                                                </div>
                                                {needed > 0 ? (
                                                    <p className="text-[10px] text-slate-400 text-right">Faltam {needed} pontos para resgatar!</p>
                                                ) : (
                                                    <p className="text-[10px] text-green-400 text-right font-bold flex items-center justify-end">
                                                        <CheckCircleIcon className="w-3 h-3 mr-1" /> Disponível para resgate!
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-slate-500 text-sm italic">Sua lista está vazia.</p>
                                    <button onClick={() => setPage('prizes')} className="mt-2 text-xs text-indigo-400 underline hover:text-indigo-300 transition">Ver prêmios na loja</button>
                                </div>
                            )}
                        </div>

                        {/* Status Indicadores Rápidos */}
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg light:bg-white light:border light:border-slate-200">
                            <h3 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center">
                                <ClockIcon className="w-5 h-5 mr-2" />
                                Status das Entregas
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl light:bg-slate-50">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 animate-pulse"></div>
                                        <span className="text-sm font-medium">Aguardando Validação</span>
                                    </div>
                                    <span className="text-sm font-bold text-yellow-500 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                                        {loggedActions.filter(l => l.userId === currentUser.id && l.status === Status.PENDING_VALIDATION).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl light:bg-slate-50">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">Validadas este mês</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-500 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                                        {loggedActions.filter(l => l.userId === currentUser.id && l.status === Status.VALIDATED && l.month === currentMonth).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl light:bg-slate-50">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">Rejeitadas</span>
                                    </div>
                                    <span className="text-sm font-bold text-red-500 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                                        {rejectedActions.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg light:bg-white light:border light:border-slate-200">
                            <h3 className="text-lg font-semibold text-indigo-400 mb-4">Pontos por Pilar</h3>
                            {pilarData.length > 0 ? (
                                <div className="space-y-4">
                                    {pilarData.map((p, i) => (
                                        <div key={p.name}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300 light:text-slate-600 truncate max-w-[150px]">{p.name}</span>
                                                <span className="text-slate-400">{p.value} pts</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-1.5 light:bg-slate-100">
                                                <div 
                                                    className="bg-indigo-500 h-1.5 rounded-full" 
                                                    style={{ width: `${(p.value / monthlyPoints) * 100}%`, opacity: 1 - (i * 0.15) }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm italic">Nenhuma ação validada este mês.</p>
                            )}
                        </div>
                        <HistoryChart data={historyData} />
                    </div>
                </div>
                {/* Side Column */}
                <div className="space-y-8">
                    {/* Mural de Reconhecimento */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-indigo-500/20">
                        <h2 className="text-xl font-semibold mb-4 text-indigo-400 flex items-center">
                            <ZapIcon className="w-5 h-5 mr-2 text-yellow-400" />
                            Mural de Elogios
                        </h2>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            {peerRecognitions.length > 0 ? peerRecognitions.map(rec => {
                                const sender = users.find(u => u.id === rec.senderId);
                                const recipient = users.find(u => u.id === rec.recipientId);
                                return (
                                    <div key={rec.id} className="p-3 bg-slate-700/40 rounded-xl animate-scale-in">
                                        <div className="flex items-center mb-1">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase">{sender?.name.split(' ')[0]}</span>
                                            <svg className="w-3 h-3 mx-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            <span className="text-[10px] font-bold text-yellow-500 uppercase">{recipient?.name.split(' ')[0]}</span>
                                        </div>
                                        <p className="text-sm italic text-slate-300">"{rec.message}"</p>
                                        <span className="text-[10px] text-slate-500 mt-2 block">{new Date(rec.timestamp).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                );
                            }) : <p className="text-center text-slate-500 py-4 italic text-sm">Seja o primeiro a enviar um elogio!</p>}
                        </div>
                        
                        <form onSubmit={handlePeerSubmit} className="space-y-3 pt-4 border-t border-slate-700">
                            <select 
                                value={peerRecipientId}
                                onChange={e => setPeerRecipientId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                                required
                            >
                                <option value="" disabled>Para quem?</option>
                                {users.filter(u => u.id !== currentUser.id).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <textarea 
                                value={peerRecognitionMessage}
                                onChange={e => setPeerRecognitionMessage(e.target.value)}
                                placeholder="Elogie um colega..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                                Enviar Elogio
                            </button>
                        </form>
                    </div>

                    {/* Quick Leaderboard */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-xl font-semibold mb-4 text-indigo-400 uppercase tracking-wider text-sm flex items-center">
                            <TrophyIcon className="w-4 h-4 mr-2" />
                            TOP 5 Analistas
                        </h2>
                        <ul className="space-y-4">
                            {leaderboardData.slice(0, 5).map((user, index) => {
                                const medalInfo = MEDAL_TIERS[user.medal];
                                const MedalIcon = medalInfo ? medalIconMap[medalInfo.iconName] : StarIcon;
                                return (
                                    <li key={user.id} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${user.id === currentUser.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-700/30'}`}>
                                        <span className={`text-sm font-black w-6 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                            #{index + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-200 truncate text-sm">{user.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{user.monthlyPoints} pts</p>
                                        </div>
                                        <MedalIcon className="w-6 h-6"/>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Ações Rejeitadas Recentes */}
                    {rejectedActions.length > 0 && (
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-red-500/20">
                            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                                <AlertTriangleIcon className="w-5 h-5 mr-2" />
                                Revisão Necessária
                            </h3>
                            <div className="space-y-3">
                                {rejectedActions.slice(0, 3).map(log => {
                                    const action = actions.find(a => a.id === log.actionId);
                                    return (
                                        <div key={log.id} className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                            <p className="text-xs font-bold text-slate-200 mb-1">{action?.description}</p>
                                            <p className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded-lg italic">
                                                "Motivo: {log.rejectionReason}"
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActionsPage: React.FC<Pick<PageContentProps, 'groupedActions' | 'onLogAction' | 'onAdminLogAction' | 'isActionLoggingLocked' | 'activeSpecialEvent' | 'getBonusPointsForAction' | 'users' | 'currentUser' | 'onSaveAction' | 'onDeleteAction'>> = ({ groupedActions, onLogAction, onAdminLogAction, isActionLoggingLocked, activeSpecialEvent, getBonusPointsForAction, users, currentUser, onSaveAction, onDeleteAction }) => {
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [notes, setNotes] = useState('');
    const [targetUserId, setTargetUserId] = useState<number>(currentUser.id);
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(Object.keys(groupedActions)[0] || null);

    const isAdmin = currentUser.role === Role.ADMIN;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAction || isSubmitting) return;

        if (isAdmin && targetUserId !== currentUser.id && !justification.trim()) {
            alert('A justificativa é obrigatória para registros em nome de outros usuários.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            if (isAdmin && targetUserId !== currentUser.id) {
                onAdminLogAction(targetUserId, selectedAction.id, notes, justification);
            } else {
                onLogAction(selectedAction.id, notes);
            }
            setSelectedAction(null);
            setNotes('');
            setJustification('');
            setIsSubmitting(false);
        }, 500);
    };

    if (isActionLoggingLocked && !isAdmin) {
        return (
             <div className="text-center p-8 bg-slate-800 rounded-lg border border-yellow-500/20">
                <h1 className="text-2xl font-bold text-yellow-400 mb-2">Registro de Ações Bloqueado</h1>
                <p className="text-slate-400">O período para registrar ações do mês anterior foi encerrado.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Registrar Ação</h1>
                    <p className="text-slate-400 text-sm">Registre suas atividades e ganhe Reconhecimento.</p>
                </div>
                {isAdmin && (
                    <button 
                        id="add-new-action-btn"
                        onClick={() => onSaveAction(null)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Adicionar Ação
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4 border border-slate-700/30">
                    <h2 className="text-xl font-semibold text-indigo-400 flex items-center">
                        <span className="bg-indigo-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span>
                        Escolha uma Ação
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(groupedActions).map(([category, actions]) => (
                            <div key={category} className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/30">
                                <button 
                                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)} 
                                    className={`w-full px-4 py-3 text-left font-bold text-slate-200 flex justify-between items-center transition-colors ${expandedCategory === category ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}
                                >
                                    {category}
                                    <svg className={`w-5 h-5 transition-transform duration-300 ${expandedCategory === category ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedCategory === category ? 'max-h-[2000px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <ul className="space-y-1 px-2">
                                        {(actions as Action[]).map(action => (
                                            <li key={action.id}>
                                                <div className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedAction?.id === action.id ? 'bg-indigo-600 shadow-md translate-x-1' : 'hover:bg-slate-700/50'}`}>
                                                    <button onClick={() => setSelectedAction(action)} className="flex-1 text-left">
                                                        <p className={`font-semibold ${selectedAction?.id === action.id ? 'text-white' : 'text-slate-200'}`}>{action.description}</p>
                                                        <p className={`text-xs mt-1 ${selectedAction?.id === action.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                            <span className={`font-bold ${selectedAction?.id === action.id ? 'text-white' : 'text-yellow-400'}`}>+{action.points}</span> pontos | Validador: {action.validator}
                                                            {activeSpecialEvent?.type === SpecialEventType.DOUBLE_POINTS_CATEGORY && activeSpecialEvent.config.category === action.category &&
                                                                <span className="ml-2 px-2 py-0.5 bg-yellow-400/20 text-yellow-300 text-[10px] font-bold rounded-full uppercase tracking-wider">Dobro!</span>
                                                            }
                                                        </p>
                                                    </button>
                                                    {isAdmin && (
                                                        <div className="flex space-x-1 ml-3 shrink-0">
                                                            <button 
                                                                id={`edit-action-btn-${action.id}`}
                                                                onClick={(e) => { e.stopPropagation(); onSaveAction(action); }} 
                                                                className="p-2 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-all"
                                                                title="Editar Ação"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                id={`delete-action-btn-${action.id}`}
                                                                onClick={(e) => { e.stopPropagation(); onDeleteAction(action.id); }} 
                                                                className="p-2 bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                                                title="Excluir Ação"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700/30">
                    <h2 className="text-xl font-semibold text-indigo-400 mb-4 flex items-center">
                        <span className="bg-indigo-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">2</span>
                        Detalhes do Registro
                    </h2>
                    {selectedAction ? (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                            {isAdmin && (
                                <div className="p-3 bg-slate-900/50 rounded-xl border border-indigo-500/20">
                                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Registrar para o usuário:</label>
                                    <select 
                                        value={targetUserId} 
                                        onChange={e => setTargetUserId(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                                    >
                                        <option value={currentUser.id}>Mim mesmo ({currentUser.name})</option>
                                        {users.filter(u => u.id !== currentUser.id).sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="p-4 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
                                <h3 className="font-bold text-indigo-300">{selectedAction.description}</h3>
                                <p className="text-sm text-slate-400 mt-1">Valor base: <span className="font-bold text-yellow-400">{selectedAction.points}</span> pts</p>
                                {getBonusPointsForAction(selectedAction) > 0 && (
                                    <p className="text-xs text-green-400 font-bold uppercase mt-1">+ {getBonusPointsForAction(selectedAction)} pts de Bônus de Evento!</p>
                                )}
                            </div>

                            {isAdmin && targetUserId !== currentUser.id && (
                                <div className="space-y-1">
                                    <label htmlFor="justification" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Justificativa Admin (Obrigatória)</label>
                                    <textarea
                                        id="justification"
                                        value={justification}
                                        onChange={e => setTargetUserId !== currentUser.id ? setJustification(e.target.value) : null}
                                        placeholder="Por que você está registrando esta ação para este usuário?"
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label htmlFor="notes" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Notas / Evidências</label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: Link da chamada, nome do cliente, ticket #12345..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => { setSelectedAction(null); setTargetUserId(currentUser.id); }} className="px-6 py-2 rounded-lg text-sm font-bold text-slate-400 bg-slate-700 hover:bg-slate-600 transition active:scale-95">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20 active:scale-95">
                                    {isSubmitting ? 'Registrando...' : 'Confirmar Registro'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 min-h-[300px] space-y-4">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700/50">
                                <ClipboardListIcon className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-center max-w-[200px]">Selecione uma ação da lista à esquerda para detalhar o registro.</p>
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

const PrizeCard: React.FC<{ prize: Prize, currentUser: User, isPrizesLocked: boolean, onRedeemPrize: (prize: Prize) => void, onToggleWishlist: (prizeId: number) => void, onSavePrize: (prize: Prize) => void, onDeletePrize: (id: number) => void }> = ({ prize, currentUser, isPrizesLocked, onRedeemPrize, onToggleWishlist, onSavePrize, onDeletePrize }) => {
    const canAfford = currentUser.points >= prize.cost;
    const isWishlisted = currentUser.wishlist?.includes(prize.id);
    const isAdmin = currentUser.role === Role.ADMIN;
    const rarityColors = {
        Normal: 'bg-slate-600',
        Limitada: 'bg-red-600 animate-pulse',
        Promocional: 'bg-green-600'
    };

    return (
        <div className={`relative bg-slate-800 p-5 rounded-lg flex flex-col justify-between shadow-lg transition-all animate-fade-in light:bg-white light:border light:border-slate-200 ${!canAfford ? 'opacity-60' : ''}`}>
            <div className="absolute top-3 right-3 flex items-center space-x-2 z-20">
                <button 
                    id={`wishlist-prize-${prize.id}`}
                    onClick={() => onToggleWishlist(prize.id)}
                    className={`p-2 rounded-full transition-all shadow-md ${isWishlisted ? 'text-red-500 bg-white' : 'text-slate-400 bg-slate-700/80 hover:text-red-400'}`}
                >
                    <HeartIcon className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                {isAdmin && (
                    <div className="flex space-x-1">
                        <button 
                            id={`edit-prize-${prize.id}`}
                            onClick={() => onSavePrize(prize)} 
                            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-all shadow-md"
                            title="Editar Prêmio"
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            id={`delete-prize-${prize.id}`}
                            onClick={() => onDeletePrize(prize.id)} 
                            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-md"
                            title="Excluir Prêmio"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
            <div className="relative">
                {prize.rarity && prize.rarity !== 'Normal' && (
                    <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg z-10 ${rarityColors[prize.rarity]}`}>
                        {prize.rarity.toUpperCase()}
                    </span>
                )}
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-slate-700 mx-auto light:bg-indigo-50">
                    <PrizeIcon iconName={prize.icon} className="h-8 w-8 text-indigo-300 light:text-indigo-600" />
                </div>
                <h3 className="text-md font-bold text-center mt-3 text-slate-100 light:text-slate-900">{prize.description}</h3>
                <p className="text-sm text-slate-400 text-center mt-1 light:text-slate-600">{prize.benefit}</p>
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

const PrizesPage: React.FC<Pick<PageContentProps, 'groupedPrizes' | 'currentUser' | 'isPrizesLocked' | 'onRedeemPrize' | 'onToggleWishlist' | 'onSavePrize' | 'onDeletePrize'>> = ({ groupedPrizes, currentUser, isPrizesLocked, onRedeemPrize, onToggleWishlist, onSavePrize, onDeletePrize }) => {
    
    if (!currentUser) return null;
    const isAdmin = currentUser.role === Role.ADMIN;

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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-100">Resgatar Prêmios</h1>
                            <p className="text-slate-400 text-sm mt-1">Transforme seu esforço em conquistas exclusivas.</p>
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => onSavePrize(null as any)}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 ml-4"
                            >
                                <PlusCircleIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">Adicionar Prêmio</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-3 bg-slate-900 border border-slate-700/50 p-3 rounded-2xl animate-fade-in shadow-xl">
                    <div className="flex items-center space-x-4 pr-4 border-r border-slate-700">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                            <SparklesIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Pontos Disponíveis</p>
                            <p className="text-xl font-bold text-yellow-400 font-mono leading-none">{currentUser.points} pts</p>
                        </div>
                    </div>
                    <div className="pl-2">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Lista de Desejos</p>
                        <div className="flex items-center space-x-2">
                             <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-red-500 transition-all duration-500" 
                                    style={{ width: `${((currentUser.wishlist?.length || 0) / 3) * 100}%` }}
                                />
                             </div>
                             <span className="text-xs font-black text-slate-100">
                                {currentUser.wishlist?.length || 0}/3
                             </span>
                        </div>
                    </div>
                </div>
            </header>
            {Object.keys(groupedPrizes).map((category) => (
                <div key={category}>
                    <h2 className="text-2xl font-semibold text-indigo-400 mb-4">{category}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {groupedPrizes[category].map(prize => (
                             <PrizeCard 
                                key={prize.id} 
                                prize={prize} 
                                currentUser={currentUser} 
                                onRedeemPrize={onRedeemPrize} 
                                isPrizesLocked={isPrizesLocked} 
                                onToggleWishlist={onToggleWishlist}
                                onSavePrize={onSavePrize}
                                onDeletePrize={onDeletePrize}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const HistoryPage: React.FC<Pick<PageContentProps, 'historyData' | 'loggedActions' | 'redemptions' | 'actions' | 'prizes' | 'currentUser'>> = ({ historyData, loggedActions, redemptions, actions, prizes, currentUser }) => {
    const [selectedMonth, setSelectedMonth] = useState<string | null>(historyData.length > 0 ? historyData[historyData.length - 1].month : null);
    const [filterStatus, setFilterStatus] = useState<Status | 'ALL'>('ALL');
    const [filterCategory, setFilterCategory] = useState<string | 'ALL'>('ALL');

    const categories = useMemo(() => {
        return Array.from(new Set(actions.map(a => a.category)));
    }, [actions]);

    const filteredActions = useMemo(() => {
        if (!currentUser) return [];
        return loggedActions
            .filter(l => l.userId === currentUser.id)
            .filter(l => selectedMonth ? l.month === selectedMonth : true)
            .filter(l => filterStatus === 'ALL' ? true : l.status === filterStatus)
            .filter(l => {
                if (filterCategory === 'ALL') return true;
                const action = actions.find(a => a.id === l.actionId);
                return action?.category === filterCategory;
            })
            .map(l => ({ ...l, action: actions.find(a => a.id === l.actionId) }));
    }, [selectedMonth, filterStatus, filterCategory, loggedActions, actions, currentUser]);

    const monthDetails = useMemo(() => {
        if (!selectedMonth || !currentUser) return null;
        
        const redeemed = redemptions.filter(r => r.userId === currentUser.id && r.requestDate.startsWith(selectedMonth) && r.status === Status.APPROVED).map(r => ({...r, prize: prizes.find(p => p.id === r.prizeId)}));
        
        return { redeemed };
    }, [selectedMonth, redemptions, prizes, currentUser]);

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 light:text-slate-900">Meu Histórico</h1>
                    <p className="text-slate-400 text-sm mt-1">Acompanhe seu desempenho e resgates ao longo do tempo.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 light:bg-white light:border-slate-200">
                        <h2 className="text-xl font-bold text-slate-100 light:text-slate-800 mb-6 flex items-center">
                            <ChartBarIcon className="w-5 h-5 mr-2 text-indigo-400" />
                            Evolução de Pontos
                        </h2>
                        <HistoryChart data={historyData} />
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 light:bg-white light:border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-100 light:text-slate-800 flex items-center">
                                <HistoryIcon className="w-5 h-5 mr-2 text-indigo-400" />
                                Detalhes e Filtros
                            </h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 light:bg-slate-50 light:border-slate-100">
                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Mês</label>
                                <select value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none light:bg-white light:border-slate-200">
                                    <option value="">Todos os meses</option>
                                    {historyData.map(h => <option key={h.month} value={h.month}>{formatMonth(h.month)}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Status</label>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Status | 'ALL')} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none light:bg-white light:border-slate-200">
                                    <option value="ALL">Todos os status</option>
                                    <option value={Status.VALIDATED}>Validado</option>
                                    <option value={Status.PENDING_VALIDATION}>Pendente</option>
                                    <option value={Status.REJECTED}>Rejeitado</option>
                                </select>
                            </div>

                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pilar</label>
                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none light:bg-white light:border-slate-200">
                                    <option value="ALL">Todos os pilares</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            {filteredActions.length > 0 ? filteredActions.map(l => (
                                <div key={l.id} className={`p-4 rounded-2xl border transition-all animate-scale-in ${
                                    l.status === Status.VALIDATED ? 'bg-green-500/5 border-green-500/20' :
                                    l.status === Status.REJECTED ? 'bg-red-500/5 border-red-500/10' :
                                    'bg-slate-700/30 border-slate-700/50'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-slate-100 truncate text-sm">{l.action?.description}</p>
                                            <p className="text-[10px] text-slate-500 flex items-center mt-1">
                                                <CalendarIcon className="w-3 h-3 mr-1" />
                                                {formatMonth(l.month)} • {l.action?.category}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black tracking-tighter uppercase px-2 py-0.5 rounded-full ${
                                            l.status === Status.VALIDATED ? 'bg-green-500/20 text-green-400' :
                                            l.status === Status.REJECTED ? 'bg-red-500/20 text-red-500' :
                                            'bg-yellow-500/20 text-yellow-500'
                                        }`}>
                                            {l.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30 flex-1 mr-4">
                                            <p className="text-xs text-slate-400 italic leading-relaxed">"{l.notes || 'Sem observações'}"</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-xl ${l.status === Status.VALIDATED ? 'text-green-400' : 'text-slate-600'}`}>
                                                {l.status === Status.VALIDATED ? `+${l.points !== undefined ? l.points : (l.action?.points || 0)}` : '--'}
                                            </p>
                                            <p className="text-[8px] text-slate-500 uppercase font-black">pontos</p>
                                        </div>
                                    </div>
                                    {l.status === Status.REJECTED && l.rejectionReason && (
                                        <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                            <p className="text-[10px] font-bold text-red-400 mb-1 flex items-center">
                                                <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                                Motivo da Rejeição:
                                            </p>
                                            <p className="text-xs text-red-200 italic leading-snug">"{l.rejectionReason}"</p>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                                    <p className="text-slate-500 text-sm italic">Nenhuma ação encontrada para os filtros.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Left Column - Summary Table & Resgates */}
                <div className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 light:bg-white light:border-slate-200 flex flex-col">
                        <h2 className="text-xl font-bold text-slate-100 light:text-slate-800 mb-6 flex items-center">
                            <TrendingUpIcon className="w-5 h-5 mr-2 text-indigo-400" />
                            Resumo por Mês
                        </h2>
                        <div className="space-y-3">
                            <div className="flex text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">
                                <span className="w-1/3">Período</span>
                                <span className="w-1/3 text-center">Ganhos</span>
                                <span className="w-1/3 text-right">Medalha</span>
                            </div>
                            {historyData.map(entry => {
                                const mInfo = entry.medal ? MEDAL_TIERS[entry.medal] : null;
                                const MIcon = mInfo ? medalIconMap[mInfo.iconName] : StarIcon;
                                return (
                                    <div key={entry.month} className="flex items-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => setSelectedMonth(entry.month)}>
                                        <div className="w-1/3">
                                            <p className="text-xs font-bold text-slate-200">{formatMonth(entry.month)}</p>
                                        </div>
                                        <div className="w-1/3 text-center">
                                            <p className="text-sm font-black text-green-400">+{entry.pontosGanhos}</p>
                                        </div>
                                        <div className="w-1/3 flex justify-end">
                                            <div className="flex items-center">
                                                <MIcon className={`w-5 h-5 ${mInfo?.color || 'text-slate-600'}`} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 light:bg-white light:border-slate-200">
                        <h2 className="text-xl font-bold text-slate-100 light:text-slate-800 mb-6 flex items-center">
                            <GiftIcon className="w-5 h-5 mr-2 text-indigo-400" />
                            Prêmios Resgatados
                        </h2>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {monthDetails?.redeemed && monthDetails.redeemed.length > 0 ? monthDetails.redeemed.map(r => (
                                <div key={r.id} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30 flex items-center justify-between">
                                    <div className="min-w-0 flex-1 mr-4">
                                        <p className="font-bold text-slate-200 truncate text-sm">{r.prize?.description}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">{r.requestDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-500 font-black text-lg">-{r.points !== undefined ? r.points : (r.prize?.cost || 0)}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 text-sm italic">Nenhum resgate aprovado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeaderboardPage: React.FC<Pick<PageContentProps, 'leaderboardData'>> = ({ leaderboardData }) => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100 light:text-slate-900">Ranking do Mês</h1>
             <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden light:bg-white light:border light:border-slate-200">
                <table className="min-w-full">
                    <thead className="bg-slate-700 light:bg-slate-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 light:text-slate-600 uppercase tracking-wider w-16">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 light:text-slate-600 uppercase tracking-wider">Analista</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 light:text-slate-600 uppercase tracking-wider">Pontos no Mês</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 light:text-slate-600 uppercase tracking-wider">Medalha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 light:divide-slate-200">
                        {leaderboardData.map((user, index) => {
                             const medalInfo = MEDAL_TIERS[user.medal];
                             const MedalIcon = medalInfo ? medalIconMap[medalInfo.iconName] : StarIcon;
                             return (
                                <tr key={user.id} className="hover:bg-slate-700/50 light:hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-yellow-500">{user.monthlyPoints}</td>
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


interface AdminOverviewProps extends Pick<PageContentProps, 'users' | 'loggedActions' | 'redemptions' | 'actions' | 'prizes' | 'adminSettings' | 'activeSpecialEvent' | 'isActionLoggingLocked'> {
    onNavigate: (tab: string) => void;
}

const AdminOverviewComponent: React.FC<AdminOverviewProps> = ({
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
    const [dateRange, setDateRange] = useState({
        start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [tempDateRange, setTempDateRange] = useState(dateRange);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]); // Empty means all analysts

    const analystUsers = useMemo(() => users.filter(u => u.role === Role.ANALYST), [users]);

    const stats = useMemo(() => {
        const startDate = parseISO(dateRange.start);
        const endDate = endOfMonth(parseISO(dateRange.end));

        const isDateInRange = (dateStr: string) => {
            const date = parseISO(dateStr);
            return isWithinInterval(date, { start: startDate, end: endDate });
        };

        const analystUsers = users.filter(u => u.role === Role.ANALYST);
        
        const targetUsers = selectedUsers.length > 0 
            ? analystUsers.filter(u => selectedUsers.includes(u.id))
            : analystUsers;

        const targetUserIds = targetUsers.map(u => u.id);

        const filteredLogs = loggedActions.filter(l => isDateInRange(l.validationDate || l.id.toString()) && (targetUserIds.includes(l.userId)));
        const filteredRedemptions = redemptions.filter(r => isDateInRange(r.requestDate) && (targetUserIds.includes(r.userId)));
        
        // 1. Average points
        const totalPointsData = targetUsers.reduce((sum, u) => sum + u.points, 0);
        const avgPoints = targetUsers.length > 0 ? totalPointsData / targetUsers.length : 0;

        // 2. Highest/Lowest score and Top 5
        const sortedAnalystsByPoints = [...analystUsers].sort((a, b) => b.points - a.points);
        const highestScore = sortedAnalystsByPoints[0];
        const lowestScore = sortedAnalystsByPoints[sortedAnalystsByPoints.length - 1];
        const top5Analysts = sortedAnalystsByPoints.slice(0, 5);

        // 3. Top 3 Actions
        const actionCounts: Record<number, number> = {};
        filteredLogs.filter(l => l.status === Status.VALIDATED).forEach(l => {
            actionCounts[l.actionId] = (actionCounts[l.actionId] || 0) + 1;
        });
        const sortedActions = actions
            .map(a => ({ ...a, count: actionCounts[a.id] || 0 }))
            .sort((a, b) => b.count - a.count);
        const top3Actions = sortedActions.slice(0, 3);
        const bottom3Actions = sortedActions.filter(a => a.count > 0).slice(-3).reverse();
        if (bottom3Actions.length < 3) {
             const allSorted = [...sortedActions].sort((a, b) => a.count - b.count);
             bottom3Actions.length = 0;
             bottom3Actions.push(...allSorted.slice(0, 3));
        }

        // 4. Top 3 Prizes
        const prizeCounts: Record<number, number> = {};
        filteredRedemptions.filter(r => r.status === Status.APPROVED).forEach(r => {
            prizeCounts[r.prizeId] = (prizeCounts[r.prizeId] || 0) + 1;
        });
        const sortedPrizes = prizes
            .map(p => ({ ...p, count: prizeCounts[p.id] || 0 }))
            .sort((a, b) => b.count - a.count);
        const top3Prizes = sortedPrizes.slice(0, 3);
        const bottom3Prizes = sortedPrizes.filter(p => p.count > 0).slice(-3).reverse();
        if (bottom3Prizes.length < 3) {
            const allSortedPrizes = [...sortedPrizes].sort((a, b) => a.count - b.count);
            bottom3Prizes.length = 0;
            bottom3Prizes.push(...allSortedPrizes.slice(0, 3));
        }

        // 5. Avg earned/redeemed points
        const totalEarnedPoints = filteredLogs
            .filter(l => l.status === Status.VALIDATED)
            .reduce((sum, l) => {
                const action = actions.find(a => a.id === l.actionId);
                const points = l.points !== undefined ? l.points : (action?.points || 0);
                return sum + points;
            }, 0);
        const totalRedeemedPoints = filteredRedemptions
            .filter(r => r.status === Status.APPROVED)
            .reduce((sum, r) => {
                const prize = prizes.find(p => p.id === r.prizeId);
                const cost = r.points !== undefined ? r.points : (prize?.cost || 0);
                return sum + cost;
            }, 0);
        
        const avgEarned = analystUsers.length > 0 ? totalEarnedPoints / analystUsers.length : 0;
        const avgRedeemed = analystUsers.length > 0 ? totalRedeemedPoints / analystUsers.length : 0;

        // 6. Potential Points
        const potentialPoints = actions.reduce((sum, a) => sum + a.points, 0);

        // 7. Wishlist Ranking
        const wishlistCounts: Record<number, number> = {};
        analystUsers.forEach(u => {
            (u.wishlist || []).forEach(prizeId => {
                wishlistCounts[prizeId] = (wishlistCounts[prizeId] || 0) + 1;
            });
        });
        const wishlistRanking = prizes
            .map(p => ({ ...p, wishCount: wishlistCounts[p.id] || 0 }))
            .filter(p => p.wishCount > 0)
            .sort((a, b) => b.wishCount - a.wishCount)
            .slice(0, 5);

        // 8. Points by Pillar (Category)
        const pillarTotals: Record<string, number> = {};
        filteredLogs.filter(l => l.status === Status.VALIDATED).forEach(l => {
            const action = actions.find(a => a.id === l.actionId);
            if (action) {
                const points = l.points !== undefined ? l.points : (action.points || 0);
                pillarTotals[action.category] = (pillarTotals[action.category] || 0) + points;
            }
        });
        const pointsByPillar = Object.entries(pillarTotals)
            .map(([category, points]) => ({ category, points }))
            .sort((a, b) => b.points - a.points);

        // 9. Delivery Status (Awaiting Admin)
        const pendingValidations = loggedActions.filter(l => l.status === Status.PENDING_VALIDATION).length;
        const pendingRedemptions = redemptions.filter(r => r.status === Status.PENDING_APPROVAL).length;

        return {
            avgPoints,
            highestScore,
            lowestScore,
            top5Analysts,
            top3Actions,
            bottom3Actions,
            top3Prizes,
            bottom3Prizes,
            avgEarned,
            avgRedeemed,
            totalEarnedPoints,
            totalRedeemedPoints,
            potentialPoints,
            analystUsersCount: analystUsers.length,
            totalPointsInCirculation: totalPointsData,
            wishlistRanking,
            pointsByPillar,
            pendingValidations,
            pendingRedemptions
        };
    }, [users, loggedActions, redemptions, actions, prizes, dateRange, selectedUsers]);

    const compiledHistory = useMemo((): HistoryEntry[] => {
        const targetUserIds = selectedUsers.length > 0 
            ? selectedUsers 
            : analystUsers.map(u => u.id);

        const months = new Set<string>();
        loggedActions
            .filter(l => targetUserIds.includes(l.userId))
            .forEach(log => months.add(log.month));
        
        redemptions
            .filter(r => targetUserIds.includes(r.userId))
            .forEach(red => months.add(new Date(red.requestDate).toISOString().slice(0, 7)));

        let filteredMonths = Array.from(months).sort();

        // Apply Time Filter to the History Chart
        const startMonth = dateRange.start ? dateRange.start.slice(0, 7) : null;
        const endMonth = dateRange.end ? dateRange.end.slice(0, 7) : null;

        if (startMonth || endMonth) {
            filteredMonths = filteredMonths.filter(m => {
                if (startMonth && m < startMonth) return false;
                if (endMonth && m > endMonth) return false;
                return true;
            });
        }

        return filteredMonths.map(month => {
            const sumGanhos = loggedActions
                .filter(log => targetUserIds.includes(log.userId) && log.month === month && log.status === Status.VALIDATED)
                .reduce((total, log) => {
                    const action = actions.find(a => a.id === log.actionId);
                    return total + (log.points !== undefined ? log.points : (action?.points || 0));
                }, 0);

            const sumResgatados = redemptions
                .filter(red => targetUserIds.includes(red.userId) && new Date(red.requestDate).toISOString().slice(0, 7) === month && red.status === Status.APPROVED)
                .reduce((total, red) => {
                    const prize = prizes.find(p => p.id === red.prizeId);
                    return total + (red.points !== undefined ? red.points : (prize?.cost || 0));
                }, 0);
                
            // For compiled chart, use AVERAGE so users can compare different group sizes, OR total. 
            // The prompt says "compilado de forma compilada de todos os analistas". Let's use totals.
            return { 
                month, 
                pontosGanhos: sumGanhos, 
                pontosResgatados: sumResgatados, 
                medal: getMedalForPoints(sumGanhos / (targetUserIds.length || 1)) 
            };
        });
    }, [selectedUsers, analystUsers, loggedActions, redemptions, actions, prizes, dateRange]);

    const handleExportExcel = () => {
        const data = [
            { Indicador: 'Média de Pontos Atual', Valor: stats.avgPoints.toFixed(2) },
            { Indicador: 'Maior Pontuação (Analista)', Valor: `${stats.highestScore?.name || 'N/A'} (${stats.highestScore?.points || 0} pts)` },
            { Indicador: 'Menor Pontuação (Analista)', Valor: `${stats.lowestScore?.name || 'N/A'} (${stats.lowestScore?.points || 0} pts)` },
            { Indicador: 'Média de Pontos Conquistados', Valor: stats.avgEarned.toFixed(2) },
            { Indicador: 'Média de Pontos Resgatados', Valor: stats.avgRedeemed.toFixed(2) },
            { Indicador: 'Soma de Pontos Possíveis (Ações)', Valor: stats.potentialPoints },
            { Indicador: 'Total de Analistas', Valor: stats.analystUsersCount },
            { Indicador: 'Total de Pontos em Circulação', Valor: stats.totalPointsInCirculation }
        ];
        exportToExcel(data, 'Relatorio_Prisma_Points');
    };

    const handleExportPDF = () => {
        const summary = [
            { label: 'Média de Pontos Atual', value: stats.avgPoints.toFixed(2) },
            { label: 'Maior Pontuação', value: `${stats.highestScore?.name || 'N/A'} (${stats.highestScore?.points || 0} pts)` },
            { label: 'Menor Pontuação', value: `${stats.lowestScore?.name || 'N/A'} (${stats.lowestScore?.points || 0} pts)` },
            { label: 'Total de Analistas', value: stats.analystUsersCount },
            { label: 'Pontos Possíveis (Soma Ações)', value: stats.potentialPoints.toLocaleString('pt-BR') }
        ];

        const headers = ['Categoria', 'Nome', 'Indicador'];
        const data = [
            ...stats.top3Actions.map(a => ['Top 3 Ações', a.description, `${a.count} execuções`]),
            ...stats.top3Prizes.map(p => ['Top 3 Prêmios', p.description, `${p.count} resgates`]),
        ];

        exportToPDF(
            'Panorama Estratégico Prisma Points',
            headers,
            data,
            'Relatorio_Prisma_Points',
            summary
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Filters and Actions */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col w-full md:w-auto">
                        <label className="text-xs text-slate-400 mb-1">Data Início</label>
                        <input 
                            type="date" 
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                            value={tempDateRange.start}
                            onChange={e => setTempDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                    </div>
                    <div className="flex flex-col w-full md:w-auto">
                        <label className="text-xs text-slate-400 mb-1">Data Fim</label>
                        <input 
                            type="date" 
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                            value={tempDateRange.end}
                            onChange={e => setTempDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <div className="flex flex-col w-full md:w-auto self-end pb-[1px]">
                        <button 
                            id="confirm-date-filter"
                            onClick={() => setDateRange(tempDateRange)}
                            className="px-6 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-all font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium text-sm">
                        <DownloadIcon className="w-4 h-4 mr-2" /> Excel
                    </button>
                    <button onClick={handleExportPDF} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-medium text-sm">
                        <DownloadIcon className="w-4 h-4 mr-2" /> PDF
                    </button>
                </div>
            </div>

            {/* Analyst Filter */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                <div className="flex flex-col">
                    <p className="text-xs text-slate-400 mb-2 font-bold flex items-center uppercase tracking-widest">
                        <UsersIcon className="w-3 h-3 mr-2" />
                        Filtrar Analistas {selectedUsers.length > 0 && <span className="ml-2 text-indigo-400">({selectedUsers.length} selecionados)</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => setSelectedUsers([])}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border ${selectedUsers.length === 0 ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                        >
                            Todos
                        </button>
                        {analystUsers.map(u => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    setSelectedUsers(prev => 
                                        prev.includes(u.id) 
                                            ? prev.filter(id => id !== u.id) 
                                            : [...prev, u.id]
                                    );
                                }}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all border ${selectedUsers.includes(u.id) ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                            >
                                {u.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <p className="text-sm font-medium text-slate-400 uppercase">Média do Time</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.avgPoints.toFixed(1)} <span className="text-sm font-normal text-slate-400">pts</span></p>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg shadow-md border-l-4 border-yellow-500 cursor-pointer hover:bg-slate-700 transition-all group" onClick={() => onNavigate('validations')}>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-slate-400 uppercase">Ações Pendentes</p>
                        <AlertCircleIcon className={`w-5 h-5 text-yellow-500 ${stats.pendingValidations > 0 ? 'animate-pulse' : 'opacity-20'}`} />
                    </div>
                    <p className="text-3xl font-bold text-white mt-1 group-hover:text-yellow-400 transition-colors">{stats.pendingValidations}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg shadow-md border-l-4 border-orange-500 cursor-pointer hover:bg-slate-700 transition-all group" onClick={() => onNavigate('redemptions')}>
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-slate-400 uppercase">Entregas Pendentes</p>
                        <PackageIcon className={`w-5 h-5 text-orange-500 ${stats.pendingRedemptions > 0 ? 'animate-pulse' : 'opacity-20'}`} />
                    </div>
                    <p className="text-3xl font-bold text-white mt-1 group-hover:text-orange-400 transition-colors">{stats.pendingRedemptions}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-400">
                    <p className="text-sm font-medium text-slate-400 uppercase">Pontos Totais</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.totalPointsInCirculation.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">pts</span></p>
                </div>
            </div>

            {/* Evolução de Pontos Chart */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center">
                            <TrendingUpIcon className="w-5 h-5 mr-3 text-indigo-400" />
                            Evolução de Pontos {selectedUsers.length > 0 ? '(Selecionados)' : '(Time Completo)'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Visão compilada mensal de ganhos vs resgates</p>
                    </div>
                </div>
                <div className="h-[400px]">
                    <HistoryChart data={compiledHistory} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status das Entregas & Wishlist Ranking */}
                <div className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                         <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <TruckIcon className="w-5 h-5 mr-3 text-orange-400" />
                                Status das Entregas
                            </h3>
                            <button onClick={() => onNavigate('redemptions')} className="text-xs text-indigo-400 hover:underline">Ver tudo</button>
                        </div>
                        <div className="space-y-4">
                            {stats.pendingRedemptions > 0 || stats.pendingValidations > 0 ? (
                                <>
                                    {stats.pendingValidations > 0 && (
                                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-yellow-500/20 transition-all" onClick={() => onNavigate('validations')}>
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mr-4">
                                                    <CheckCircleIcon className="w-6 h-6 text-yellow-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Validar Ações</p>
                                                    <p className="text-xs text-slate-400">{stats.pendingValidations} ações aguardando revisão</p>
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-yellow-500 transition-colors" />
                                        </div>
                                    )}
                                    {stats.pendingRedemptions > 0 && (
                                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => onNavigate('redemptions')}>
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mr-4">
                                                    <PackageIcon className="w-6 h-6 text-orange-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Entregar Prêmios</p>
                                                    <p className="text-xs text-slate-400">{stats.pendingRedemptions} resgates para processar</p>
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircleIcon className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-20" />
                                    <p className="text-slate-500 text-sm">Tudo em dia! Nenhuma ação pendente.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <HeartIcon className="w-5 h-5 mr-3 text-pink-400" />
                                Lista de Desejos (Ranking)
                            </h3>
                            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded uppercase font-bold tracking-widest">Popularidade</span>
                        </div>
                        <div className="space-y-4">
                            {stats.wishlistRanking.length > 0 ? stats.wishlistRanking.map((prize, i) => (
                                <div key={prize.id} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-black text-pink-400">
                                        #{i+1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-sm font-bold text-slate-200">{prize.description}</p>
                                            <span className="text-xs font-black text-slate-500">{prize.wishCount} desejos</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden border border-slate-600/50">
                                            <div 
                                                className="bg-gradient-to-r from-pink-600 to-pink-400 h-full rounded-full transition-all duration-1000" 
                                                style={{ width: `${(prize.wishCount / (stats.wishlistRanking[0]?.wishCount || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center py-4 text-slate-500 text-sm">Nenhum desejo registrado ainda.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top 5 Analistas */}
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <TrophyIcon className="w-5 h-5 mr-3 text-yellow-500" />
                                Top 5 Analistas
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Ranking atualizado por pontos acumulados</p>
                        </div>
                        <TargetIcon className="w-8 h-8 text-indigo-500/20" />
                    </div>
                    <div className="space-y-6">
                        {stats.top5Analysts.map((user, i) => (
                            <div key={user.id} className="relative flex items-center bg-slate-700/30 p-4 rounded-xl border border-slate-600/30 group hover:border-indigo-500/50 transition-all overflow-hidden">
                                {i === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 font-black transition-transform group-hover:scale-110 ${
                                    i === 0 ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/20' : 
                                    i === 1 ? 'bg-slate-300 text-slate-900' : 
                                    i === 2 ? 'bg-orange-400 text-slate-900' : 'bg-slate-600 text-white'
                                }`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{user.name}</p>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest">{user.username}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white">{user.points.toLocaleString('pt-BR')}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Pontos Atuais</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Strategic View: Pillars and Earned/Redeemed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pontos por Pilar */}
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <DiamondIcon className="w-5 h-5 mr-3 text-indigo-400" />
                                Pontos por Pilar
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Visão estratégica de produtividade por área</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {stats.pointsByPillar.length > 0 ? stats.pointsByPillar.map((pillar) => (
                            <div key={pillar.category} className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-300 flex items-center tracking-tight">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                                        {pillar.category}
                                    </span>
                                    <span className="font-black text-white">{pillar.points.toLocaleString('pt-BR')} pts</span>
                                </div>
                                <div className="w-full bg-slate-700/50 rounded-full h-3 border border-slate-600/30 overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000 shadow-inner" 
                                        style={{ width: `${(pillar.points / (stats.pointsByPillar[0]?.points || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 opacity-30">
                                <TargetIcon className="w-16 h-16 mx-auto mb-4" />
                                <p>Sem dados para o período.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pontos Ganhos e Pontos Resgatados Strategic View */}
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <ActivityIcon className="w-5 h-5 mr-3 text-green-400" />
                                Pontos Ganhos vs Resgatados
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Equilíbrio da economia de pontos no período</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Ganhos Totais</p>
                            <p className="text-2xl font-black text-white">{stats.totalEarnedPoints.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Resgates Totais</p>
                            <p className="text-2xl font-black text-white">{stats.totalRedeemedPoints.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                            <p className="text-xs text-slate-300 leading-relaxed italic">
                                {stats.totalEarnedPoints > stats.totalRedeemedPoints * 1.5 
                                    ? "Insight: A equipe está acumulando muitos pontos. Considere incentivar resgates ou lançar prêmios exclusivos."
                                    : stats.totalRedeemedPoints > stats.totalEarnedPoints
                                        ? "Insight: Os resgates superaram os ganhos. A economia está girando rápido."
                                        : "Insight: Equilíbrio saudável entre conquista e recompensa."}
                            </p>
                        </div>
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
        return <div className="text-center p-8 bg-slate-800 rounded-lg light:bg-white light:border light:border-slate-200"><p>Nenhuma ação pendente de validação.</p></div>;
    }

    return (
        <div className="space-y-6">
            {Object.values(pendingActions).map(({ user, logs }) => (
                <div key={user.id} className="bg-slate-800 p-6 rounded-lg shadow-lg light:bg-white light:border light:border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                        <h3 className="text-xl font-semibold text-indigo-400">{user.name}</h3>
                        <div className="flex space-x-2">
                            <button onClick={() => onBulkValidate(user.id, Status.VALIDATED)} className="px-3 py-1 text-sm font-medium text-green-300 bg-green-500/20 rounded-md hover:bg-green-500/40 transition">Validar Tudo</button>
                            <button onClick={() => onBulkValidate(user.id, Status.REJECTED)} className="px-3 py-1 text-sm font-medium text-red-300 bg-red-500/20 rounded-md hover:bg-red-500/40 transition">Rejeitar Tudo</button>
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {logs.map(log => {
                            const action = actions.find(a => a.id === log.actionId);
                            const isExiting = exitingLog?.id === log.id;
                            const exitClass = isExiting ? (exitingLog.status === 'VALIDATED' ? 'animate-slide-out-left' : 'animate-slide-out-right') : '';

                            return (
                                <li key={log.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-700 rounded-md transition-all duration-500 gap-2 light:bg-slate-50 ${exitClass}`}>
                                    <div className="flex-1">
                                        <p className="font-medium">{action?.description}</p>
                                        <p className="text-sm text-slate-400 mt-1 italic">"{log.notes}"</p>
                                        {log.rejectionReason && (
                                            <p className="text-xs text-red-400 mt-1 font-medium bg-red-400/10 p-1 rounded inline-block">Anteriormente rejeitado: {log.rejectionReason}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end space-x-2">
                                        <span className="text-yellow-400 font-bold mr-2">+{action?.points}</span>
                                        <button onClick={() => onValidateAction(log.id, Status.REJECTED)} title="Rejeitar com motivo" className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition"><XCircleIcon className="w-6 h-6" /></button>
                                        <button onClick={() => onValidateAction(log.id, Status.VALIDATED)} title="Validar" className="p-2 rounded-full hover:bg-green-500/20 text-green-400 transition"><CheckCircleIcon className="w-6 h-6" /></button>
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

const ManageActionsComponent: React.FC<Pick<PageContentProps, 'actions' | 'onSaveAction' | 'onDeleteAction'>> = ({ actions, onSaveAction, onDeleteAction }) => {
    const summary = useMemo(() => {
        const groups: Record<string, number> = {};
        actions.forEach(a => {
            groups[a.category] = (groups[a.category] || 0) + a.points;
        });
        return Object.entries(groups).sort((a,b) => b[1] - a[1]);
    }, [actions]);

    return (
        <div className="space-y-6">
            <ManageGenericComponent
                title="Gerenciar Ações"
                items={actions}
                columns={[{key: 'category', label: 'Categoria'}, {key: 'description', label: 'Descrição'}, {key: 'points', label: 'Pontos'}, {key: 'validator', label: 'Validador'}]}
                onAddItem={() => onSaveAction(null)}
                onEditItem={(action) => onSaveAction(action)}
                onDeleteItem={onDeleteAction}
                addLabel="Adicionar Ação"
            />
            
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">Equilíbrio por Área (Soma de Pontos)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {summary.map(([category, points]) => (
                        <div key={category} className="bg-slate-700 p-4 rounded-md border-l-4 border-indigo-500">
                            <p className="text-xs text-slate-400 uppercase font-bold">{category}</p>
                            <p className="text-2xl font-bold text-white">{points} <span className="text-sm font-normal text-slate-400">pts totais</span></p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
    const [logJustification, setLogJustification] = useState('');

    const handleNotificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notificationMessage.trim()) return;
        onSendNotification(notificationRecipient, notificationMessage);
        setNotificationMessage('');
    };

    const handleAdminLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!logForUser || !logAction) return;
        if (!logJustification.trim()) {
            alert('A justificativa é obrigatória.');
            return;
        }
        onAdminLogAction(Number(logForUser), Number(logAction), logNotes, logJustification);
        setLogForUser('');
        setLogAction('');
        setLogNotes('');
        setLogJustification('');
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
                <h3 className="text-xl font-semibold text-indigo-400 mb-4 text-sm md:text-base">Registrar Ação para Usuário</h3>
                 <form onSubmit={handleAdminLogSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={logForUser} onChange={e => setLogForUser(Number(e.target.value))} className="w-full bg-slate-700 p-2 rounded" required>
                            <option value="" disabled>Selecione um usuário</option>
                            {users.filter(u => u.role === Role.ANALYST).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <select value={logAction} onChange={e => setLogAction(Number(e.target.value))} className="w-full bg-slate-700 p-2 rounded" required>
                            <option value="" disabled>Selecione uma ação</option>
                            {actions.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                        </select>
                    </div>
                    <textarea value={logJustification} onChange={e => setLogJustification(e.target.value)} placeholder="Justificativa do Admin (Obrigatória)" className="w-full bg-slate-700 p-2 rounded" rows={2} required />
                    <input type="text" value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notas / Evidências (Opcional)" className="w-full bg-slate-700 p-2 rounded" />
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Registrar Ação</button>
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
        icon: prize?.icon || 'GiftIcon',
        rarity: prize?.rarity || 'Normal',
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
                        <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Descrição</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white" required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-300">Custo (pontos)</label>
                            <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white" required/>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300">Raridade</label>
                            <select name="rarity" value={formData.rarity} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white">
                                <option value="Normal">Normal</option>
                                <option value="Limitada">Limitada</option>
                                <option value="Promocional">Promocional</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Benefício</label>
                        <input type="text" name="benefit" value={formData.benefit} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white" required/>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300">Ícone</label>
                        <select name="icon" value={formData.icon} onChange={handleChange} className="w-full mt-1 bg-slate-700 rounded p-2 border border-slate-600 text-white">
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

// --- Global Search Component ---
const GlobalSearch: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    actions: Action[];
    prizes: Prize[];
    missions: Mission[];
    setPage: (page: Page) => void;
    onSelectPrize?: (prize: Prize) => void;
}> = ({ isOpen, onClose, actions, prizes, missions, setPage, onSelectPrize }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
        }
    }, [isOpen]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        
        const actionResults = actions
            .filter(a => a.description.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
            .map(a => ({ type: 'action', data: a }));
        
        const prizeResults = prizes
            .filter(p => p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
            .map(p => ({ type: 'prize', data: p }));

        const missionResults = missions
            .filter(m => m.description.toLowerCase().includes(q) || m.title.toLowerCase().includes(q))
            .map(m => ({ type: 'mission', data: m }));
        
        return [...actionResults, ...prizeResults, ...missionResults].slice(0, 10);
    }, [query, actions, prizes, missions]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center pt-[10vh] px-4" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex items-center">
                    <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Buscar missões, prêmios, ações..." 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="bg-transparent border-none text-white w-full focus:ring-0 text-lg"
                    />
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {query.trim() && results.length === 0 && (
                        <div className="p-8 text-center text-slate-400">Nenhum resultado encontrado para "{query}"</div>
                    )}
                    {results.length > 0 && (
                        <div className="divide-y divide-slate-700">
                            {results.map((res, i) => (
                                <button 
                                    key={`${res.type}-${(res.data as any).id}`}
                                    onClick={() => {
                                        if (res.type === 'action') setPage('actions');
                                        if (res.type === 'prize') setPage('prizes');
                                        if (res.type === 'mission') setPage('missions');
                                        onClose();
                                    }}
                                    className="w-full text-left p-4 hover:bg-slate-700 transition flex items-center justify-between"
                                >
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-lg mr-4 ${res.type === 'action' ? 'bg-green-500/10 text-green-400' : res.type === 'prize' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                            {res.type === 'action' ? <CheckCircleIcon className="w-5 h-5" /> : res.type === 'prize' ? <GiftIcon className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-200">{(res.data as any).description || (res.data as any).title}</p>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">{(res.data as any).category || 'Especial'} • {res.type === 'action' ? 'Ação' : res.type === 'prize' ? 'Prêmio' : 'Missão'}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-yellow-400">
                                        {res.type === 'action' ? `+${(res.data as Action).points} pts` : res.type === 'prize' ? `${(res.data as Prize).cost} pts` : ''}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {!query.trim() && (
                        <div className="p-8 text-center text-slate-500">
                            Comece a digitar para buscar atalhos e itens...
                        </div>
                    )}
                </div>
                <div className="p-3 bg-slate-900/50 border-t border-slate-700 flex justify-between text-[10px] text-slate-500 font-mono">
                    <div className="flex space-x-4">
                        <span><kbd className="bg-slate-700 px-1 rounded">ESC</kbd> Fechar</span>
                        <span><kbd className="bg-slate-700 px-1 rounded">↵</kbd> Selecionar</span>
                    </div>
                    <span>Prisma Points v2.0</span>
                </div>
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
        case 'admin':
        case 'admin_prizes': return <AdminPage {...props} />;
        default: return <Dashboard {...props} />;
    }
};

const BulkImportComponent: React.FC<PageContentProps> = ({ onBulkImport, users, actions, prizes }) => {
    const [importType, setImportType] = useState<'actions' | 'redemptions'>('actions');
    const [importText, setImportText] = useState('');
    
    const exampleActions = `ID_USUARIO;MES;ID_ACAO;PONTOS;NOTAS
5;2024-05;1;120;Excelente performance
17;2024-05;0;500;Pontos de migração`;

    const exampleRedemptions = `ID_USUARIO;ID_PREMIO;DATA;STATUS
5;1;2024-05-10;Aprovado
17;9;2024-05-11;Aprovado`;

    const handleImport = () => {
        const lines = importText.trim().split('\n');
        if (lines.length < 2) {
            alert('Formato inválido. Siga o template.');
            return;
        }

        const headers = lines[0].split(';');
        const items = lines.slice(1).map(line => {
            const values = line.split(';');
            const obj: any = {};
            headers.forEach((header, index) => {
                const key = header.trim().toUpperCase();
                const val = values[index]?.trim();
                
                if (key === 'ID_USUARIO') obj.userId = Number(val);
                if (key === 'MES') obj.month = val;
                if (key === 'ID_ACAO') obj.actionId = Number(val);
                if (key === 'PONTOS') obj.points = Number(val);
                if (key === 'NOTAS') obj.notes = val;
                if (key === 'ID_PREMIO') obj.prizeId = Number(val);
                if (key === 'DATA') obj.requestDate = val;
                if (key === 'STATUS') {
                    if (val === 'Aprovado') obj.status = Status.APPROVED;
                    else if (val === 'Validado') obj.status = Status.VALIDATED;
                }
            });
            return obj;
        });

        onBulkImport({ type: importType, items });
        setImportText('');
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-indigo-400">Importação em Massa</h2>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setImportType('actions')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${importType === 'actions' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        Ações/Histórico
                    </button>
                    <button 
                        onClick={() => setImportType('redemptions')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${importType === 'redemptions' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        Resgates
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                    Cole os dados abaixo (Formato CSV com ponto e vírgula ';')
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase font-black">Exemplo de formato:</p>
                    <pre className="text-[10px] text-indigo-300 font-mono mb-4 whitespace-pre-wrap">
                        {importType === 'actions' ? exampleActions : exampleRedemptions}
                    </pre>
                    <textarea 
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder="ID_USUARIO;MES;ID_ACAO;PONTOS;NOTAS"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm font-mono h-64 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Iniciar Importação
                </button>
            </div>
        </div>
    );
};

const AdminPage: React.FC<PageContentProps> = (props) => {
    const [adminTab, setAdminTab] = useState(props.page === 'admin_prizes' ? 'prizes' : 'overview');

    useEffect(() => {
        if (props.page === 'admin_prizes') {
            setAdminTab('prizes');
        }
    }, [props.page]);

    const tabs = [
        { id: 'overview', label: 'Visão Geral' },
        { id: 'validations', label: 'Validações' },
        { id: 'redemptions', label: 'Resgates' },
        { id: 'users', label: 'Usuários' },
        { id: 'actions', label: 'Ações' },
        { id: 'prizes', label: 'Editar Loja de Prêmios' },
        { id: 'missions', label: 'Missões' },
        { id: 'events', label: 'Eventos' },
        { id: 'import', label: 'Importação' },
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
            case 'import': return <BulkImportComponent {...props} />;
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
    
    // Point Synchronization on Version Change
    useEffect(() => {
        const lastVersion = getFromLocalStorage('prisma-points-version', '1.0.0');
        if (lastVersion !== APP_VERSION) {
            setUsers(prevUsers => {
                // Keep existing admins (to preserve customizations if any)
                const admins = prevUsers.filter(u => u.role === Role.ADMIN);
                // Get all analysts from the new USERS constant
                const newAnalysts = USERS.filter(u => u.role === Role.ANALYST);
                
                // Merge, preferring new analyst data but keeping current admins
                // To keep it simple and respect the prompt "reset/sync history":
                return [...admins, ...newAnalysts];
            });
            
            // Sync history
            setLoggedActions(prev => {
                // Keep only user-created actions (higher IDs or not in constants)
                // Actually, just resetting to LOGGED_ACTIONS for a clean migration
                return LOGGED_ACTIONS;
            });
            
            setRedemptions(prev => {
                return REDEMPTIONS;
            });

            saveToLocalStorage('prisma-points-version', APP_VERSION);
            console.log(`Synced points to version ${APP_VERSION}`);
        }
    }, []);
    const [actions, setActions] = useState<Action[]>(() => getFromLocalStorage('prisma-points-actions', ACTIONS));
    const [prizes, setPrizes] = useState<Prize[]>(() => getFromLocalStorage('prisma-points-prizes', PRIZES));
    const [loggedActions, setLoggedActions] = useState<LoggedAction[]>(() => getFromLocalStorage('prisma-points-logged-actions', LOGGED_ACTIONS));
    const [redemptions, setRedemptions] = useState<Redemption[]>(() => getFromLocalStorage('prisma-points-redemptions', REDEMPTIONS));
    const [notifications, setNotifications] = useState<AppNotification[]>(() => getFromLocalStorage('prisma-points-notifications', NOTIFICATIONS));
    const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => getFromLocalStorage('prisma-points-admin-settings', INITIAL_ADMIN_SETTINGS));
    const [missions, setMissions] = useState<Mission[]>(() => getFromLocalStorage('prisma-points-missions', MISSIONS));
    const [userMissionProgress, setUserMissionProgress] = useState<UserMissionProgress[]>(() => getFromLocalStorage('prisma-points-user-mission-progress', USER_MISSION_PROGRESS));
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>(() => getFromLocalStorage('prisma-points-special-events', SPECIAL_EVENTS));
    const [peerRecognitions, setPeerRecognitions] = useState<PeerRecognition[]>(() => getFromLocalStorage('prisma-points-peer-recognitions', []));

    
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
    const [rejectionModalInfo, setRejectionModalInfo] = useState<{ logId: number | null, userId: number | null, redemptionId: number | null } | null>(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => getFromLocalStorage('prisma-points-theme', 'dark'));
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    
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
    useEffect(() => { saveToLocalStorage('prisma-points-theme', theme); }, [theme]);
    useEffect(() => { saveToLocalStorage('prisma-points-peer-recognitions', peerRecognitions); }, [peerRecognitions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


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

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
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

        const today = getToday();
        if (currentUser.lastActionDate === today && currentUser.role !== Role.ADMIN) {
            showNotification('Você já registrou uma ação hoje. Aguarde o próximo período.', 'error');
            return;
        }

        const newLog: LoggedAction = {
            id: Date.now(),
            userId: currentUser.id,
            actionId,
            month: getCurrentMonth(),
            notes,
            status: Status.PENDING_VALIDATION,
        };

        const updatedUser: User = { ...currentUser, lastActionDate: today };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        setLoggedActions(prev => [...prev, newLog]);
        showNotification('Ação registrada! Aguardando validação.');
    };

    const handleToggleWishlist = (prizeId: number) => {
        if (!currentUser) return;
        const currentWishlist = currentUser.wishlist || [];
        const isFavorite = currentWishlist.includes(prizeId);
        
        if (!isFavorite && currentWishlist.length >= 3) {
            showNotification('Você só pode ter até 3 itens na sua lista de desejos.', 'error');
            return;
        }

        const newWishlist = isFavorite 
            ? currentWishlist.filter(id => id !== prizeId)
            : [...currentWishlist, prizeId];
        
        const updatedUser: User = { ...currentUser, wishlist: newWishlist };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
        showNotification(isFavorite ? 'Removido da lista de desejos' : 'Adicionado à lista de desejos');
    };

    const handleSendPeerRecognition = (recipientId: number, message: string) => {
        if (!currentUser) return;
        const newRecognition: PeerRecognition = {
            id: Date.now(),
            senderId: currentUser.id,
            recipientId,
            message,
            timestamp: new Date().toISOString(),
        };
        
        setPeerRecognitions(prev => [newRecognition, ...prev]);
        
        // Also send a notification to the recipient
        const recipient = users.find(u => u.id === recipientId);
        handleSendNotification(recipientId, `${currentUser.name} enviou um novo reconhecimento para você: "${message}"`);
        showNotification(`Reconhecimento enviado para ${recipient?.name}!`);
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

    const handleAdminLogActionForUser = (userId: number, actionId: number, notes: string, justification?: string) => {
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
            justification,
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
                const points = log.points !== undefined ? log.points : (action?.points || 0);
                return sum + points;
            }, 0);
    }, [actions]);

    const calculatePointsFromLogs = useCallback((currentLoggedActions: LoggedAction[]) => {
        return currentLoggedActions
            .filter(log => log.status === Status.VALIDATED)
            .reduce((total, log) => {
                const action = actions.find(a => a.id === log.actionId);
                const points = log.points !== undefined ? log.points : (action?.points || 0);
                return total + points;
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
        
        if (newStatus === Status.REJECTED) {
            setRejectionModalInfo({ logId, userId: null });
            setRejectionReasonInput('');
            return;
        }

        executeValidation(logId, newStatus);
    };

    const executeValidation = (logId: number, newStatus: Status.VALIDATED | Status.REJECTED, reason: string = '') => {
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
                setLoggedActions(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus, rejectionReason: reason, validationDate: new Date().toISOString().split('T')[0] } : l));
                showNotification('Ação rejeitada.');
                handleSendNotification(log.userId, `Sua ação "${actions.find(a => a.id === log.actionId)?.description}" foi rejeitada. Motivo: ${reason}`);
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

        if (status === Status.REJECTED) {
            setRejectionModalInfo({ logId: null, userId });
            setRejectionReasonInput('');
            return;
        }

        if(!window.confirm(`Tem certeza que deseja validar todas as ${logsToUpdate.length} ações pendentes de ${user.name}?`)) {
            return;
        }

        executeBulkValidation(userId, status);
    };

    const executeBulkValidation = (userId: number, status: Status.VALIDATED | Status.REJECTED, reason: string = '') => {
        const logsToUpdate = loggedActions.filter(l => l.userId === userId && (l.status === Status.PENDING_VALIDATION || l.status === Status.PENDING));
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

        setLoggedActions(prev => prev.map(l => logIdsToUpdate.includes(l.id) ? { ...l, status, rejectionReason: status === Status.REJECTED ? reason : l.rejectionReason, validationDate: new Date().toISOString().split('T')[0] } : l));

        if(totalPointsToAdd > 0) {
            updateUserPoints(userId, totalPointsToAdd);
        }

        if (status === Status.REJECTED) {
            showNotification(`${logIdsToUpdate.length} ações de ${users.find(u => u.id === userId)?.name} foram rejeitadas.`);
            handleSendNotification(userId, `Suas ${logIdsToUpdate.length} ações pendentes foram rejeitadas. Motivo: ${reason}`);
        } else {
            showNotification(`Ações em massa para ${users.find(u => u.id === userId)?.name} foram validadas.`);
            const oldMedal = getMedalForPoints(calculateMonthlyPoints(userId, getCurrentMonth(), loggedActions.filter(l => !logIdsToUpdate.includes(l.id))));
            if (finalMedal !== oldMedal && MEDAL_TIERS[finalMedal].points > MEDAL_TIERS[oldMedal].points) {
                handleSendNotification(userId, `Parabéns! Você alcançou a medalha de ${finalMedal} este mês!`);
                setMedalCelebration(finalMedal);
            }
        }
    }


    const handleApproveRedemption = (redemptionId: number, newStatus: Status.APPROVED | Status.REFUSED) => {
        const redemption = redemptions.find(r => r.id === redemptionId);
        if (!redemption) return;

        if (newStatus === Status.REFUSED) {
            setRejectionModalInfo({ logId: null, userId: null, redemptionId });
            setRejectionReasonInput('');
            return;
        }

        executeRedemptionValidation(redemptionId, newStatus);
    };

    const executeRedemptionValidation = (redemptionId: number, newStatus: Status.APPROVED | Status.REFUSED, reason: string = '') => {
        const redemption = redemptions.find(r => r.id === redemptionId);
        if (!redemption) return;

        setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status: newStatus, refusalReason: newStatus === Status.REFUSED ? reason : r.refusalReason, approvalDate: new Date().toISOString().split('T')[0] } : r));

        if (newStatus === Status.APPROVED) {
            showNotification('Resgate aprovado!');
        } else {
            const prize = prizes.find(p => p.id === redemption.prizeId);
            if (prize) {
                // Return points if refused
                updateUserPoints(redemption.userId, prize.cost);
                showNotification('Resgate recusado e pontos estornados.');
                handleSendNotification(redemption.userId, `Seu resgate de "${prize.description}" foi recusado. Motivo: ${reason}. Os pontos foram devolvidos à sua conta.`);
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
                    return total + (log.points !== undefined ? log.points : (action?.points || 0));
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

    const handleBulkImport = (data: { type: 'actions' | 'redemptions', items: any[] }) => {
        if (data.type === 'actions') {
            const newActions = data.items.map(item => ({
                id: Date.now() + Math.random(),
                userId: item.userId,
                actionId: item.actionId || 0,
                points: item.points,
                month: item.month || getCurrentMonth(),
                notes: item.notes || 'Importação em massa',
                status: item.status || Status.VALIDATED,
                validationDate: item.status === Status.VALIDATED ? (item.validationDate || getToday()) : undefined
            }));
            
            setLoggedActions(prev => [...prev, ...newActions]);
            
            // Update points for each user based on validated actions
            const userPointsMap: Record<number, number> = {};
            newActions.forEach(action => {
                if (action.status === Status.VALIDATED) {
                    const pts = action.points !== undefined ? action.points : (actions.find(a => a.id === action.actionId)?.points || 0);
                    userPointsMap[action.userId] = (userPointsMap[action.userId] || 0) + pts;
                }
            });
            
            setUsers(prevUsers => prevUsers.map(u => ({
                ...u,
                points: u.points + (userPointsMap[u.id] || 0)
            })));
            
            showNotification(`${newActions.length} ações importadas com sucesso!`);
        } else {
            const newRedemptions = data.items.map(item => ({
                id: Date.now() + Math.random(),
                userId: item.userId,
                prizeId: item.prizeId,
                points: item.points, // Optional override
                requestDate: item.requestDate || getToday(),
                status: item.status || Status.APPROVED,
                approvalDate: item.status === Status.APPROVED ? (item.approvalDate || getToday()) : undefined
            }));
            
            setRedemptions(prev => [...prev, ...newRedemptions]);

            // Update points for each user based on approved redemptions
            const userDebitsMap: Record<number, number> = {};
            newRedemptions.forEach(redemption => {
                if (redemption.status === Status.APPROVED) {
                    const prize = prizes.find(p => p.id === redemption.prizeId);
                    const pts = redemption.points !== undefined ? redemption.points : (prize?.cost || 0);
                    userDebitsMap[redemption.userId] = (userDebitsMap[redemption.userId] || 0) + pts;
                }
            });

            setUsers(prevUsers => prevUsers.map(u => ({
                ...u,
                points: u.points - (userDebitsMap[u.id] || 0)
            })));

            showNotification(`${newRedemptions.length} resgates importados com sucesso!`);
        }
    };

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
        <div className={`flex h-screen overflow-hidden font-sans ${theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-900 light-theme'}`}>
            <Sidebar 
                user={currentUser} 
                currentPage={page} 
                setPage={setPage} 
                onLogout={handleLogout} 
                prizes={prizes}
                onToggleWishlist={handleToggleWishlist}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={currentUser} 
                    points={animatedPoints}
                    pointsJustUpdated={pointsJustUpdated}
                    unreadCount={unreadNotificationsCount} 
                    onToggleNotifications={handleToggleNotifications}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    notificationsToggleRef={notificationsToggleRef}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    onOpenSearch={() => setIsSearchOpen(true)}
                />
                <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <PageContent 
                        page={page} 
                        setPage={setPage}
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
                        onToggleWishlist={handleToggleWishlist}
                        onSendPeerRecognition={handleSendPeerRecognition}
                        peerRecognitions={peerRecognitions}
                        onBulkImport={handleBulkImport}
                    />
                </main>
            </div>
            
            {isSearchOpen && (
                <GlobalSearch 
                    isOpen={isSearchOpen} 
                    onClose={() => setIsSearchOpen(false)} 
                    actions={actions}
                    prizes={prizes}
                    missions={missions}
                    setPage={setPage}
                />
            )}

            
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
            {rejectionModalInfo && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-xl font-bold flex items-center text-red-400">
                                <XCircleIcon className="w-6 h-6 mr-2" />
                                Justificativa da Rejeição
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-400">
                                Por favor, informe o motivo pelo qual esta ação está sendo rejeitada. O analista receberá esta justificativa.
                            </p>
                            <textarea
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                placeholder="Ex: Evidência incompleta, descrição incorreta..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 h-32 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-200 resize-none"
                                autoFocus
                            />
                        </div>
                        <div className="p-6 bg-slate-900/50 flex space-x-3">
                            <button
                                onClick={() => setRejectionModalInfo(null)}
                                className="flex-1 px-4 py-2 border border-slate-700 rounded-xl hover:bg-slate-800 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (!rejectionReasonInput.trim()) {
                                        showNotification('O motivo da rejeição é obrigatório.', 'error');
                                        return;
                                    }
                                    if (rejectionModalInfo.logId !== null) {
                                        executeValidation(rejectionModalInfo.logId, Status.REJECTED, rejectionReasonInput);
                                    } else if (rejectionModalInfo.userId !== null) {
                                        executeBulkValidation(rejectionModalInfo.userId, Status.REJECTED, rejectionReasonInput);
                                    } else if (rejectionModalInfo.redemptionId !== null) {
                                        executeRedemptionValidation(rejectionModalInfo.redemptionId, Status.REFUSED, rejectionReasonInput);
                                    }
                                    setRejectionModalInfo(null);
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-lg shadow-red-600/20"
                            >
                                Confirmar Rejeição
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;