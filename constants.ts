// FIX: Import React to use React.FC type.
import { Action, Prize, User, Role, LoggedAction, Redemption, Status, AppNotification, AdminSettings, Medal, Mission, MissionType, MissionGoalType, UserMissionProgress, SpecialEvent } from './types';

export const APP_VERSION = '2.4.0';

export const USERS: User[] = [
  { id: 2, name: 'Administrador', username: 'admin', password: '123', role: Role.ADMIN, points: 5000 },
  { id: 31, name: 'Alex Almeida', username: 'alex.a', password: '123', role: Role.ANALYST, points: 2950, wishlist: [10, 22] },
  { id: 32, name: 'Ana Silva', username: 'ana.s', password: '123', role: Role.ANALYST, points: 2850, wishlist: [15, 27] },
  { id: 33, name: 'Beatriz Costa', username: 'beatriz.c', password: '123', role: Role.ANALYST, points: 2950, wishlist: [11] },
  { id: 34, name: 'Caio Souza', username: 'caio.s', password: '123', role: Role.ANALYST, points: 2950, wishlist: [22, 28] },
  { id: 35, name: 'Daniel Oliveira', username: 'daniel.o', password: '123', role: Role.ANALYST, points: 2950, wishlist: [23] },
  { id: 36, name: 'Felipe Santos', username: 'felipe.s', password: '123', role: Role.ANALYST, points: 2950, wishlist: [26] },
  { id: 37, name: 'Guilherme Lima', username: 'guilherme.l', password: '123', role: Role.ANALYST, points: 2950, wishlist: [24] },
  { id: 38, name: 'Junior Andrade', username: 'junior.a', password: '123', role: Role.ANALYST, points: 2950, wishlist: [22] },
  { id: 39, name: 'Lucas Rocha', username: 'lucas.r', password: '123', role: Role.ANALYST, points: 2950, wishlist: [30] },
  { id: 40, name: 'Matheus Ferreira', username: 'matheus.f', password: '123', role: Role.ANALYST, points: 2950, wishlist: [29] },
  { id: 41, name: 'Tiago Souza', username: 'tiago.s', password: '123', role: Role.ANALYST, points: 2950, wishlist: [28] },
  { id: 42, name: 'Wellingson Silveira', username: 'wellingson.s', password: '123', role: Role.ANALYST, points: 2950, wishlist: [27] },
];

export const ACTIONS: Action[] = [
    { id: 0, category: 'Sistema', description: 'Importação de Histórico', points: 0, validator: 'Sistema' },
    { id: 1, category: 'Excelência no Atendimento', description: 'Comentário positivo de cliente referente a atendimento', points: 120, validator: 'Liderança' },
    { id: 2, category: 'Excelência no Atendimento', description: 'Obter 100% de nota de Qualidade interna', points: 100, validator: 'Qualidade' },
    { id: 3, category: 'Colaboração e Desenvolvimento', description: 'Mentoria e desenvolvimento de colegas', points: 100, validator: 'Liderança' },
    { id: 4, category: 'Comprometimento', description: 'Não ter tido ausências durante o mês', points: 100, validator: 'Liderança' },
    { id: 5, category: 'Comprometimento', description: 'Pontualidade de horários seguindo a sua escala', points: 100, validator: 'Liderança' },
    { id: 6, category: 'Desenvolvimento Pessoal', description: 'Aplicação prática de aprendizados adquiridos em treinamentos', points: 100, validator: 'Analista' },
    { id: 7, category: 'Excelência no Atendimento', description: 'Realização de Contato ativo com o cliente', points: 100, validator: 'Analista' },
    { id: 8, category: 'Operacional', description: 'Logar corretamente e atender a fila de backup telefônico', points: 90, validator: 'Liderança' },
    { id: 9, category: 'Excelência no Atendimento', description: 'Ser referência no atendimento de um produto ou tipo de cliente', points: 90, validator: 'Especialista' },
    { id: 10, category: 'Inovação', description: 'Criação de soluções alternativas em atendimentos complexos', points: 90, validator: 'Analista' },
    { id: 11, category: 'Proatividade', description: 'Proatividade na identificação e resolução de problemas da área', points: 90, validator: 'Liderança' },
    { id: 12, category: 'Proatividade', description: 'Sinalizar caso crítico', points: 90, validator: 'Especialista' },
    { id: 13, category: 'Colaboração e Desenvolvimento', description: 'Compartilhamento coletivo de conhecimento / boas práticas', points: 90, validator: 'Analista' },
    { id: 14, category: 'Comprometimento', description: 'Disponibilidade para adaptação de rotinas', points: 90, validator: 'Liderança' },
    { id: 15, category: 'Inovação', description: 'Sugerir solução para o/um problema levantado', points: 85, validator: 'Liderança' },
    { id: 16, category: 'Colaboração e Desenvolvimento', description: 'Se prontificar ou engajar em projetos demandados das áreas de apoio', points: 85, validator: 'Liderança' },
    { id: 17, category: 'Proatividade', description: 'Sinalizações de falhas na Gaia', points: 80, validator: 'Especialista' },
    { id: 18, category: 'Inovação', description: 'Inovação e apresentação de novas ideias', points: 80, validator: 'Liderança' },
    { id: 19, category: 'Desenvolvimento Pessoal', description: 'Participação em treinamentos ou workshops (não obrigatórios)', points: 80, validator: 'Analista' },
    { id: 20, category: 'Operacional', description: 'Validação de histórico de chamados e contextualizar o ticket atual', points: 70, validator: 'Qualidade' },
    { id: 21, category: 'Inovação', description: 'Criação de conteúdos faltantes', points: 70, validator: 'Especialista' },
    { id: 22, category: 'Colaboração e Desenvolvimento', description: 'Reconhecimento interno de outras áreas', points: 70, validator: 'Liderança' },
    { id: 23, category: 'Colaboração e Desenvolvimento', description: 'Colaboração com colegas - aviso importantes, ações de impacto coletivo', points: 70, validator: 'Analista' },
    { id: 24, category: 'Engajamento', description: 'Engajamento nas iniciativas internas', points: 70, validator: 'Liderança' },
    { id: 25, category: 'Engajamento', description: 'Reação aos comunicados no dia útil de trabalho da pessoa', points: 70, validator: 'Analista' },
    { id: 26, category: 'Operacional', description: 'Assinatura do Checklist dentro do prazo', points: 70, validator: 'Liderança' },
    { id: 27, category: 'Comprometimento', description: 'Seguir corretamente a escala presencial no mês', points: 70, validator: 'Liderança' },
    { id: 28, category: 'Operacional', description: 'Seguir corretamente a abertura de ticket no Fluxo especialista', points: 60, validator: 'Especialista' },
    { id: 29, category: 'Operacional', description: 'Seguir corretamente a abertura de ticket no Fluxo Hardware', points: 60, validator: 'Especialista' },
    { id: 30, category: 'Proatividade', description: 'Sinalizar conteúdo faltante na Central de Ajuda/Notebook LM / Gaia', points: 60, validator: 'Analista' },
    { id: 31, category: 'Colaboração e Desenvolvimento', description: 'Ter sido reconhecido por um colega', points: 60, validator: 'Liderança' },
    { id: 32, category: 'Engajamento', description: 'Participação em reunião com postura ativa', points: 60, validator: 'Analista' },
    { id: 33, category: 'Comprometimento', description: 'Sinalizar ausências programadas previamente', points: 60, validator: 'Liderança' },
    { id: 34, category: 'Operacional', description: 'Preenchimento e envio da planilha de ações mensalmente dentro do prazo', points: 60, validator: 'Analista' },
    { id: 35, category: 'Colaboração e Desenvolvimento', description: 'Reconhecimento positivo de colegas', points: 50, validator: 'Analista' },
];

export const PRIZES: Prize[] = [
    { id: 0, category: 'Sistema', description: 'Consolidação de Histórico (Débito)', cost: 0, benefit: 'Saldo migrado do sistema anterior', icon: 'ScissorsIcon' },
    { id: 1, category: 'Até 550', description: 'Pegar points com outra pessoa', cost: 300, benefit: 'Flexibilidade na troca de HO/presencial', icon: 'UsersIcon' },
    { id: 2, category: 'Até 550', description: 'Receber uma mentoria técnica', cost: 350, benefit: 'Troca presencial e HO', icon: 'BookOpenIcon' },
    { id: 3, category: 'Até 550', description: 'Entrar 30 min mais tarde uma vez', cost: 350, benefit: 'Flexibilidade no horário', icon: 'CalendarIcon' },
    { id: 4, category: 'Até 550', description: 'Treinamento regras zendesk', cost: 400, benefit: 'Desenvolvimento profissional', icon: 'BookOpenIcon' },
    { id: 5, category: 'Até 550', description: 'Conhecer o detalhamento sobre os custos do setor', cost: 400, benefit: 'Conhecimento sobre a área', icon: 'BriefcaseIcon' },
    { id: 6, category: 'Até 550', description: 'Participação em projeto da área', cost: 450, benefit: 'Desenvolvimento profissional', icon: 'BriefcaseIcon' },
    { id: 7, category: 'Até 550', description: 'Conhecer fluxos e lógica Eddie /Gaia', cost: 525, benefit: 'Conhecimento técnico', icon: 'BookOpenIcon' },
    { id: 8, category: 'Até 550', description: 'Treinamento power point/planejamento/excel', cost: 550, benefit: 'Desenvolvimento profissional', icon: 'BookOpenIcon' },
    { id: 9, category: '560 a 900', description: '1 Saída 30 min antecipada', cost: 560, benefit: 'Bem-estar e flexibilidade', icon: 'CalendarIcon' },
    { id: 10, category: '560 a 900', description: '1 Almoço prolongado - 30min', cost: 650, benefit: 'Bem-estar e flexibilidade', icon: 'CoffeeIcon' },
    { id: 11, category: '560 a 900', description: 'Entrar 60 min mais tarde uma vez', cost: 650, benefit: 'Bem-estar e flexibilidade', icon: 'CalendarIcon' },
    { id: 12, category: '560 a 900', description: '1 Pausa estendida - 30min direto', cost: 750, benefit: 'Bem-estar', icon: 'CoffeeIcon' },
    { id: 13, category: '560 a 900', description: 'Experiência de ver a rotina de líder por 1 dia', cost: 850, benefit: 'Autonomia e conhecimento', icon: 'BriefcaseIcon' },
    { id: 14, category: '560 a 900', description: 'Prioridade para escolha de férias', cost: 900, benefit: 'Autonomia e reconhecimento', icon: 'SunIcon' },
    { id: 15, category: '560 a 900', description: '1 Saída 60 min antecipada', cost: 900, benefit: 'Bem-estar e flexibilidade', icon: 'CalendarIcon' },
    { id: 16, category: '1000 a 1400', description: 'Café com a Fê', cost: 1000, benefit: 'Networking e visibilidade', icon: 'CoffeeIcon' },
    { id: 17, category: '1000 a 1400', description: 'Mentoria com a equipe estratégica', cost: 1100, benefit: 'Desenvolvimento profissional', icon: 'UsersIcon' },
    { id: 18, category: '1000 a 1400', description: 'Mentoria com CGC', cost: 1200, benefit: 'Desenvolvimento profissional', icon: 'UsersIcon' },
    { id: 19, category: '1000 a 1400', description: 'Aprofundamento em áreas estratégicas', cost: 1200, benefit: 'Ampliação de conhecimento técnico', icon: 'BookOpenIcon' },
    { id: 20, category: '1000 a 1400', description: 'Mentoria com alguém de outra área', cost: 1300, benefit: 'Ampliação de networking', icon: 'UsersIcon' },
    { id: 21, category: '1000 a 1400', description: 'Mentoria com a diretoria', cost: 1400, benefit: 'Networking e visibilidade estratégica', icon: 'UsersIcon' },
    { id: 22, category: '1500+', description: 'Trocar 1 presencial por 1 dia H.O (T/Q)', cost: 1900, benefit: 'Flexibilidade e autonomia', icon: 'HomeIcon' },
    { id: 23, category: '1500+', description: 'Trocar 1 presencial por 1 dia H.O (T/Q/S)', cost: 1500, benefit: 'Flexibilidade e autonomia', icon: 'HomeIcon' },
    { id: 24, category: '1500+', description: 'No dia do feriado, escala reduzida (meio período)', cost: 2000, benefit: 'Bem-estar e flexibilidade', icon: 'CalendarIcon' },
    { id: 25, category: '1500+', description: 'Folga aos Domingo para time 24h', cost: 1600, benefit: 'Redução de estresse', icon: 'SunIcon' },
    { id: 26, category: '1500+', description: '2 dias de dayoff (1 + 1 bônus)', cost: 2200, benefit: 'Recuperação e revitalização', icon: 'SunIcon' },
    { id: 27, category: '1500+', description: '1 Folga', cost: 2500, benefit: 'Equilíbrio vida pessoal/profissional', icon: 'SunIcon' },
    { id: 28, category: '1500+', description: 'Emenda de feriado Corpus Christ', cost: 3000, benefit: 'Bem-estar e descanso', icon: 'SunIcon' },
    { id: 29, category: '1500+', description: 'Emenda de feriado Natal / Ano Novo', cost: 3500, benefit: 'Bem-estar e descanso', icon: 'SunIcon' },
    { id: 30, category: '1500+', description: 'Emenda de feriado Carnaval', cost: 4000, benefit: 'Bem-estar e descanso', icon: 'SunIcon' },
];

export const LOGGED_ACTIONS: LoggedAction[] = [
    // Alex Almeida (31)
    { id: 2001, userId: 31, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2002, userId: 31, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2003, userId: 31, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2004, userId: 31, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2005, userId: 31, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2006, userId: 31, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2007, userId: 31, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2008, userId: 31, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2009, userId: 31, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Ana Silva (32)
    { id: 2010, userId: 32, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2011, userId: 32, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2012, userId: 32, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2013, userId: 32, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2014, userId: 32, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2015, userId: 32, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2016, userId: 32, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2017, userId: 32, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2018, userId: 32, actionId: 0, points: 100, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Beatriz Costa (33)
    { id: 2019, userId: 33, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2020, userId: 33, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2021, userId: 33, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2022, userId: 33, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2023, userId: 33, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2024, userId: 33, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2025, userId: 33, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2026, userId: 33, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2027, userId: 33, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Caio Souza (34)
    { id: 2028, userId: 34, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2029, userId: 34, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2030, userId: 34, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2031, userId: 34, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2032, userId: 34, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2033, userId: 34, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2034, userId: 34, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2035, userId: 34, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2036, userId: 34, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Daniel Oliveira (35)
    { id: 2037, userId: 35, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2038, userId: 35, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2039, userId: 35, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2040, userId: 35, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2041, userId: 35, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2042, userId: 35, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2043, userId: 35, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2044, userId: 35, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2045, userId: 35, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Felipe Santos (36)
    { id: 2046, userId: 36, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2047, userId: 36, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2048, userId: 36, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2049, userId: 36, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2050, userId: 36, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2051, userId: 36, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2052, userId: 36, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2053, userId: 36, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2054, userId: 36, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Guilherme Lima (37)
    { id: 2055, userId: 37, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2056, userId: 37, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2057, userId: 37, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2058, userId: 37, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2059, userId: 37, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2060, userId: 37, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2061, userId: 37, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2062, userId: 37, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2063, userId: 37, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Junior Andrade (38)
    { id: 2064, userId: 38, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2065, userId: 38, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2066, userId: 38, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2067, userId: 38, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2068, userId: 38, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2069, userId: 38, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2070, userId: 38, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2071, userId: 38, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2072, userId: 38, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Lucas Rocha (39)
    { id: 2073, userId: 39, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2074, userId: 39, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2075, userId: 39, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2076, userId: 39, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2077, userId: 39, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2078, userId: 39, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2079, userId: 39, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2080, userId: 39, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2081, userId: 39, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Matheus Ferreira (40)
    { id: 2082, userId: 40, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2083, userId: 40, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2084, userId: 40, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2085, userId: 40, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2086, userId: 40, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2087, userId: 40, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2088, userId: 40, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2089, userId: 40, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2090, userId: 40, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Tiago Souza (41)
    { id: 2091, userId: 41, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2092, userId: 41, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2093, userId: 41, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2094, userId: 41, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2095, userId: 41, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2096, userId: 41, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2097, userId: 41, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2098, userId: 41, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2099, userId: 41, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Wellingson Silveira (42)
    { id: 2100, userId: 42, actionId: 0, points: 100, month: '2025-08', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2101, userId: 42, actionId: 0, points: 450, month: '2025-09', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2102, userId: 42, actionId: 0, points: 400, month: '2025-10', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2103, userId: 42, actionId: 0, points: 250, month: '2025-11', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2104, userId: 42, actionId: 0, points: 500, month: '2025-12', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2105, userId: 42, actionId: 0, points: 300, month: '2026-01', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2106, userId: 42, actionId: 0, points: 400, month: '2026-02', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2107, userId: 42, actionId: 0, points: 350, month: '2026-03', notes: 'Histórico', status: Status.VALIDATED },
    { id: 2108, userId: 42, actionId: 0, points: 200, month: '2026-04', notes: 'Histórico', status: Status.VALIDATED },

    // Current Pending Actions for Dashboard
    { id: 3001, userId: 31, actionId: 1, requestDate: '2026-05-10', month: '2026-05', status: Status.PENDING_APPROVAL },
    { id: 3002, userId: 32, actionId: 2, requestDate: '2026-05-11', month: '2026-05', status: Status.PENDING_APPROVAL },
];

export const REDEMPTIONS: Redemption[] = [
    { id: 3001, userId: 31, prizeId: 27, requestDate: '2026-05-01', status: Status.PENDING_APPROVAL },
    { id: 3002, userId: 32, prizeId: 15, requestDate: '2026-05-02', status: Status.PENDING_APPROVAL },
    { id: 1, userId: 1, prizeId: 9, requestDate: '2024-06-15', status: Status.APPROVED, approvalDate: '2024-06-16' },
];

export const NOTIFICATIONS: AppNotification[] = [
    { id: 1, senderId: 2, recipientId: 1, message: 'Lembre-se de preencher suas ações mensais até o final da semana!', timestamp: new Date().toISOString(), read: false },
    { id: 2, senderId: 2, recipientId: 'all', message: 'A loja de prêmios foi atualizada com novos itens incríveis!', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true }, // 1 day ago
];

export const INITIAL_ADMIN_SETTINGS: AdminSettings = {
    actionsLockedUntil: null,
    prizesLocked: false,
};

export const MISSIONS: Mission[] = [
    {
        id: 1,
        title: 'Engajamento Rápido',
        description: 'Reaja a 3 comunicados da sua liderança ou da empresa.',
        type: MissionType.DAILY,
        rewardPoints: 15,
        isGlobal: true,
        goal: { type: MissionGoalType.LOG_ACTION_CATEGORY, category: 'Engajamento', count: 3 },
    },
    {
        id: 2,
        title: 'Colaborador da Semana',
        description: 'Registre 2 ações de colaboração ou desenvolvimento com seus colegas.',
        type: MissionType.WEEKLY,
        rewardPoints: 50,
        isGlobal: true,
        goal: { type: MissionGoalType.LOG_ACTION_CATEGORY, category: 'Colaboração e Desenvolvimento', count: 2 },
    },
    {
        id: 3,
        title: 'Mestre da Inovação',
        description: 'Faça 5 registros na categoria de Inovação este mês, sugerindo melhorias e novas ideias.',
        type: MissionType.MONTHLY,
        rewardPoints: 200,
        isGlobal: true,
        goal: { type: MissionGoalType.LOG_ACTION_CATEGORY, category: 'Inovação', count: 5 },
    }
];

export const USER_MISSION_PROGRESS: UserMissionProgress[] = [];

export const SPECIAL_EVENTS: SpecialEvent[] = [];


export const MEDAL_TIERS: { [key in Medal]: { points: number; iconName: string; color: string; progressColor: string; } } = {
    [Medal.DIAMOND]: { points: 1401, iconName: 'Diamond', color: 'text-cyan-400', progressColor: 'bg-cyan-400' },
    [Medal.GOLD]: { points: 901, iconName: 'Gold', color: 'text-yellow-400', progressColor: 'bg-yellow-400' },
    [Medal.SILVER]: { points: 551, iconName: 'Silver', color: 'text-slate-300', progressColor: 'bg-slate-300' },
    [Medal.BRONZE]: { points: 0, iconName: 'Bronze', color: 'text-amber-600', progressColor: 'bg-amber-600' },
};
