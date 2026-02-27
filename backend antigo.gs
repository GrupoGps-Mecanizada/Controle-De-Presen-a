// ============================================
// BACKEND - SISTEMA DE CONTROLE DE PRESENÇA V3.0
// Google Apps Script - Deploy as Web App
// ============================================

/**
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Cole este código no Google Apps Script
 * 2. Criar planilha com abas: Supervisores, Colaboradores, Registro_Presenca
 * 3. Execute a função setupSheets() uma vez para criar estrutura
 * 4. Deploy como Web App com acesso "Anyone"
 * 5. Copie a URL do deploy e cole no frontend (CONFIG.API_URL)
 */

// Função auxiliar para retornar JSON
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// NÍVEIS DE ACESSO
// ============================================
const ACCESS_LEVELS = {
  SUPERVISOR: 'supervisor',
  GESTAO: 'gestao'
};

// ============================================
// CÓDIGOS DE STATUS (ATUALIZADOS)
// ============================================
const STATUS_CODES = {
  'P': 'Presente',
  'F': 'Falta',
  'FE': 'Férias',
  'TR': 'Treinamento',
  'AF': 'Afastado',
  'AT': 'Atestado',
  'FO': 'Folga',
  'EX': 'Extra',
  'TH': 'Troca de Horário',
  'TE': 'Troca de Escala',
  'DS': 'Desligado'
};

// ============================================
// HANDLERS DE REQUISIÇÃO
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'login':
        return handleLogin(e);
      case 'getEmployees':
        return getEmployeesBySupervisor(e);
      case 'getAttendance':
        return getAttendanceData(e);
      case 'getDashboard':
        return getDashboardData(e);
      default:
        return responseJSON({ success: false, error: 'Ação inválida' });
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return responseJSON({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      data = e.parameter;
    }
    
    const action = data.action;
    
    switch(action) {
      case 'saveAttendance':
        return saveAttendance(data);
      case 'saveMultipleAttendance':
        return saveMultipleAttendance(data);
      default:
        return responseJSON({ success: false, error: 'Ação inválida' });
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return responseJSON({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// AUTENTICAÇÃO
// ============================================
function handleLogin(e) {
  const username = e.parameter.username;
  const password = e.parameter.password;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const supervisorSheet = ss.getSheetByName('Supervisores');
  
  if (!supervisorSheet) {
    return responseJSON({ 
      success: false, 
      error: 'Planilha de supervisores não encontrada. Execute setupSheets() primeiro.' 
    });
  }
  
  const data = supervisorSheet.getDataRange().getValues();
  
  // Procura supervisor (pula cabeçalho)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const supervisorName = row[1]; // Coluna B (Nome)
    const supervisorPass = row[2]; // Coluna C (Senha)
    const isActive = row[5];        // Coluna F (Ativo)
    const accessLevel = row[6] || ACCESS_LEVELS.SUPERVISOR; // Coluna G (Nível de Acesso)
    
    if (supervisorName.toString().toUpperCase() === username.toUpperCase() && 
        supervisorPass.toString() === password &&
        isActive === 'SIM') {
      return responseJSON({ 
        success: true, 
        supervisor: {
          id: row[0],
          nome: supervisorName,
          email: row[3],
          telefone: row[4],
          accessLevel: accessLevel
        }
      });
    }
  }
  
  return responseJSON({ success: false, error: 'Credenciais inválidas ou usuário inativo' });
}

// ============================================
// COLABORADORES
// ============================================
function getEmployeesBySupervisor(e) {
  const supervisorName = e.parameter.supervisor;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const colaboradoresSheet = ss.getSheetByName('Colaboradores');
  
  if (!colaboradoresSheet) {
    return responseJSON({ success: false, error: 'Planilha de colaboradores não encontrada' });
  }
  
  const data = colaboradoresSheet.getDataRange().getValues();
  const employees = [];
  
  // Busca colaboradores do supervisor (pula cabeçalho)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const empSupervisor = row[4]; // Coluna E (Supervisor)
    const status = row[5];         // Coluna F (Status)
    
    if (empSupervisor.toString().toUpperCase() === supervisorName.toUpperCase() && 
        status === 'ATIVO') {
      employees.push({
        id: row[0],              // Coluna A (ID)
        nome: row[1],            // Coluna B (Nome)
        funcao: row[2],          // Coluna C (Função)
        regime: row[3],          // Coluna D (Regime)
        supervisor: row[4],      // Coluna E (Supervisor)
        status: row[5]           // Coluna F (Status)
      });
    }
  }
  
  return responseJSON({ success: true, employees: employees });
}

// ============================================
// REGISTRO DE PRESENÇA
// ============================================
function saveAttendance(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let registroSheet = ss.getSheetByName('Registro_Presenca');
  
  // Cria planilha se não existir
  if (!registroSheet) {
    registroSheet = createRegistroSheet(ss);
  }
  
  // Gera ID único
  const recordId = 'ATT-' + Date.now();
  const timestamp = new Date();
  
  // Adiciona registro
  const rowData = [
    recordId,
    data.date,
    data.employeeId,
    data.employeeName,
    data.function,
    data.regime,
    data.supervisor,
    data.status,
    data.observations || '',
    timestamp
  ];
  
  registroSheet.appendRow(rowData);
  
  // Formata última linha
  const lastRow = registroSheet.getLastRow();
  formatRegistroRow(registroSheet, lastRow, data.status);
  
  return responseJSON({ success: true, recordId: recordId });
}

function saveMultipleAttendance(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let registroSheet = ss.getSheetByName('Registro_Presenca');
  
  if (!registroSheet) {
    registroSheet = createRegistroSheet(ss);
  }
  
  const records = data.records;
  const timestamp = new Date();
  const recordIds = [];
  
  // Prepara dados para inserção em lote (mais eficiente)
  const rowsToAdd = [];
  
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const recordId = 'ATT-' + timestamp.getTime() + '-' + i;
    recordIds.push(recordId);
    
    rowsToAdd.push([
      recordId,
      rec.date,
      rec.employeeId,
      rec.employeeName,
      rec.function,
      rec.regime,
      rec.supervisor,
      rec.status,
      rec.observations || '',
      timestamp
    ]);
  }
  
  // Insere todos de uma vez (mais rápido)
  if (rowsToAdd.length > 0) {
    const startRow = registroSheet.getLastRow() + 1;
    registroSheet.getRange(startRow, 1, rowsToAdd.length, 10).setValues(rowsToAdd);
    
    // Formata linhas
    for (let i = 0; i < rowsToAdd.length; i++) {
      formatRegistroRow(registroSheet, startRow + i, records[i].status);
    }
  }
  
  return responseJSON({ success: true, recordIds: recordIds, count: recordIds.length });
}

function createRegistroSheet(ss) {
  const registroSheet = ss.insertSheet('Registro_Presenca');
  registroSheet.appendRow([
    'ID', 'Data', 'Colaborador ID', 'Colaborador Nome', 'Função', 
    'Regime', 'Supervisor', 'Status', 'Observações', 'Timestamp'
  ]);
  
  const header = registroSheet.getRange(1, 1, 1, 10);
  header.setFontWeight('bold')
        .setBackground('#1e40af')
        .setFontColor('white')
        .setFontSize(10);
  
  registroSheet.setFrozenRows(1);
  registroSheet.setColumnWidth(1, 150);
  registroSheet.setColumnWidth(2, 100);
  registroSheet.setColumnWidth(4, 200);
  
  return registroSheet;
}

function formatRegistroRow(sheet, row, status) {
  // Formata data
  sheet.getRange(row, 2).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(row, 10).setNumberFormat('dd/mm/yyyy HH:mm:ss');
  
  // Formata célula de status
  const statusCell = sheet.getRange(row, 8);
  formatStatusCell(statusCell, status);
}

function formatStatusCell(cell, status) {
  const statusColors = {
    'P': { bg: '#d1fae5', text: '#065f46' },
    'F': { bg: '#fee2e2', text: '#991b1b' },
    'FE': { bg: '#fef3c7', text: '#92400e' },
    'TR': { bg: '#dbeafe', text: '#1e40af' },
    'AF': { bg: '#e5e7eb', text: '#374151' },
    'AT': { bg: '#fed7aa', text: '#9a3412' },
    'FO': { bg: '#ede9fe', text: '#5b21b6' },
    'EX': { bg: '#ccfbf1', text: '#115e59' },
    'TH': { bg: '#fce7f3', text: '#9f1239' },
    'TE': { bg: '#cffafe', text: '#164e63' },
    'DS': { bg: '#f1f5f9', text: '#1e293b' }
  };
  
  const color = statusColors[status] || { bg: '#f9fafb', text: '#111827' };
  cell.setBackground(color.bg).setFontColor(color.text).setFontWeight('bold');
}

// ============================================
// CONSULTA DE DADOS
// ============================================
function getAttendanceData(e) {
  const date = e.parameter.date;
  const supervisor = e.parameter.supervisor;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registroSheet = ss.getSheetByName('Registro_Presenca');
  
  if (!registroSheet) {
    return responseJSON({ success: true, records: [] });
  }
  
  const data = registroSheet.getDataRange().getValues();
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const recordDate = Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const recordSupervisor = row[6];
    
    if (recordDate === date && recordSupervisor.toString().toUpperCase() === supervisor.toUpperCase()) {
      records.push({
        id: row[0],
        date: recordDate,
        employeeId: row[2],
        employeeName: row[3],
        function: row[4],
        regime: row[5],
        supervisor: row[6],
        status: row[7],
        observations: row[8],
        timestamp: row[9]
      });
    }
  }
  
  return responseJSON({ success: true, records: records });
}

// ============================================
// DASHBOARD COMPLETO (SOMENTE GESTÃO)
// ============================================
function getDashboardData(e) {
  const startDate = e.parameter.startDate;
  const endDate = e.parameter.endDate;
  const supervisor = e.parameter.supervisor || 'all';
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registroSheet = ss.getSheetByName('Registro_Presenca');
  const colaboradoresSheet = ss.getSheetByName('Colaboradores');
  
  if (!registroSheet || !colaboradoresSheet) {
    return responseJSON({ 
      success: false, 
      error: 'Planilhas necessárias não encontradas' 
    });
  }
  
  // Obter dados
  const registroData = registroSheet.getDataRange().getValues();
  const colaboradoresData = colaboradoresSheet.getDataRange().getValues();
  
  // Filtrar registros no período
  const filteredRecords = [];
  for (let i = 1; i < registroData.length; i++) {
    const row = registroData[i];
    const recordDate = Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const recordSupervisor = row[6];
    
    if (recordDate >= startDate && recordDate <= endDate) {
      if (supervisor === 'all' || recordSupervisor.toString().toUpperCase() === supervisor.toUpperCase()) {
        filteredRecords.push({
          date: recordDate,
          employeeId: row[2],
          employeeName: row[3],
          function: row[4],
          regime: row[5],
          supervisor: row[6],
          status: row[7]
        });
      }
    }
  }
  
  // Calcular totais de status
  const statusTotals = {
    P: 0, F: 0, FE: 0, TR: 0, AF: 0, AT: 0, FO: 0, EX: 0, TH: 0, TE: 0, DS: 0
  };
  
  filteredRecords.forEach(record => {
    if (statusTotals.hasOwnProperty(record.status)) {
      statusTotals[record.status]++;
    }
  });
  
  // Top 10 colaboradores com mais atestados
  const atestadosMap = {};
  filteredRecords.forEach(record => {
    if (record.status === 'AT') {
      if (!atestadosMap[record.employeeId]) {
        atestadosMap[record.employeeId] = {
          name: record.employeeName,
          count: 0
        };
      }
      atestadosMap[record.employeeId].count++;
    }
  });
  
  const topAtestados = Object.values(atestadosMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Top 10 colaboradores com mais faltas
  const faltasMap = {};
  filteredRecords.forEach(record => {
    if (record.status === 'F') {
      if (!faltasMap[record.employeeId]) {
        faltasMap[record.employeeId] = {
          name: record.employeeName,
          count: 0
        };
      }
      faltasMap[record.employeeId].count++;
    }
  });
  
  const topFaltas = Object.values(faltasMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Estatísticas diárias
  const dailyStatsMap = {};
  filteredRecords.forEach(record => {
    if (!dailyStatsMap[record.date]) {
      dailyStatsMap[record.date] = {
        date: record.date,
        P: 0, F: 0, FE: 0, TR: 0, AF: 0, AT: 0, FO: 0, EX: 0, TH: 0, TE: 0, DS: 0
      };
    }
    if (dailyStatsMap[record.date].hasOwnProperty(record.status)) {
      dailyStatsMap[record.date][record.status]++;
    }
  });
  
  const dailyStats = Object.values(dailyStatsMap)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Montar grid completo
  const dates = getDatesInRange(startDate, endDate);
  const employees = [];
  const recordsGrid = {};
  
  // Buscar colaboradores ativos
  for (let i = 1; i < colaboradoresData.length; i++) {
    const empRow = colaboradoresData[i];
    if (empRow[5] === 'ATIVO') {
      if (supervisor === 'all' || empRow[4].toString().toUpperCase() === supervisor.toUpperCase()) {
        employees.push({
          id: empRow[0],
          nome: empRow[1],
          funcao: empRow[2],
          regime: empRow[3],
          supervisor: empRow[4]
        });
        recordsGrid[empRow[0]] = {};
      }
    }
  }
  
  // Preencher grid
  filteredRecords.forEach(record => {
    if (recordsGrid[record.employeeId]) {
      recordsGrid[record.employeeId][record.date] = record.status;
    }
  });
  
  return responseJSON({
    success: true,
    data: {
      statusTotals: statusTotals,
      topAtestados: topAtestados,
      topFaltas: topFaltas,
      dailyStats: dailyStats,
      fullGrid: {
        dates: dates,
        employees: employees,
        records: recordsGrid
      }
    }
  });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  while (current <= end) {
    dates.push(Utilities.formatDate(current, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// ============================================
// SETUP INICIAL (EXECUTAR UMA VEZ)
// ============================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Cria planilha de Colaboradores
  let colaboradoresSheet = ss.getSheetByName('Colaboradores');
  if (!colaboradoresSheet) {
    colaboradoresSheet = ss.insertSheet('Colaboradores');
    colaboradoresSheet.appendRow([
      'ID', 'Nome Completo', 'Função', 'Regime', 'Supervisor', 'Status', 
      'Data Início', 'Data Fim', 'Observações'
    ]);
    
    const header = colaboradoresSheet.getRange(1, 1, 1, 9);
    header.setFontWeight('bold')
          .setBackground('#1e40af')
          .setFontColor('white')
          .setFontSize(10);
    colaboradoresSheet.setFrozenRows(1);
    
    // Dados de exemplo
    colaboradoresSheet.appendRow([
      'COL001', 'João Silva', 'Operador', '8x6', 'SEBASTIÃO', 'ATIVO', 
      '01/01/2024', '', ''
    ]);
  }
  
  // Cria planilha de Supervisores
  let supervisorSheet = ss.getSheetByName('Supervisores');
  if (!supervisorSheet) {
    supervisorSheet = ss.insertSheet('Supervisores');
    supervisorSheet.appendRow([
      'ID', 'Nome', 'Senha', 'Email', 'Telefone', 'Ativo', 'Nível de Acesso'
    ]);
    
    const header = supervisorSheet.getRange(1, 1, 1, 7);
    header.setFontWeight('bold')
          .setBackground('#1e40af')
          .setFontColor('white')
          .setFontSize(10);
    supervisorSheet.setFrozenRows(1);
    
    // Adiciona supervisores
    const supervisors = [
      ['SUP001', 'SEBASTIÃO', '123456', 'sebastiao@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP002', 'JUNIOR PEREIRA', '123456', 'junior@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP003', 'ASPIRADOR', '123456', 'aspirador@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP004', 'ISRAEL', '123456', 'israel@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP005', 'MATUSALEM', '123456', 'matusalem@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP006', 'WELLISON', '123456', 'wellison@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP007', 'OZIAS', '123456', 'ozias@empresa.com', '', 'SIM', 'supervisor'],
      ['SUP008', '16 HORAS', '123456', '16horas@empresa.com', '', 'SIM', 'supervisor'],
      ['ADMIN001', 'ADMIN', 'admin123', 'admin@empresa.com', '', 'SIM', 'gestao']
    ];
    
    supervisorSheet.getRange(2, 1, supervisors.length, 7).setValues(supervisors);
  }
  
  Logger.log('✅ Estrutura de planilhas criada com sucesso!');
  Logger.log('📋 Planilhas criadas: Supervisores, Colaboradores');
  Logger.log('👤 Usuário Admin criado: admin / admin123');
  Logger.log('📊 Registro_Presenca será criado automaticamente no primeiro uso');
}

/**
 * INSTRUÇÕES FINAIS:
 * 
 * 1. Execute setupSheets() uma vez no editor de scripts
 * 2. Clique em "Deploy" > "New deployment"
 * 3. Selecione "Web app"
 * 4. Configure:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copie a URL do deploy
 * 6. Cole no frontend em CONFIG.API_URL
 * 7. Adicione seus colaboradores na planilha "Colaboradores"
 * 
 * NÍVEIS DE ACESSO:
 * - supervisor: Acessa apenas marcação de presença
 * - gestao: Acessa dashboard completo + marcação
 * 
 * NOVOS STATUS DISPONÍVEIS:
 * P, F, FE, TR, AF, AT, FO, EX, TH (Troca Horário), TE (Troca Escala), DS (Desligado)
 */