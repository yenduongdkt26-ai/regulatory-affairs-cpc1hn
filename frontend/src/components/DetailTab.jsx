import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CalendarClock, 
  ClipboardList,
  Copy,
  Check,
  Search,
  X
} from 'lucide-react';
import { copyTableToClipboard } from './copyHelper';

export default function DetailTab({ sheetType, sheetName, employees, sheetData, user }) {
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [copiedEmp, setCopiedEmp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('overdue'); // 'overdue', '1m', '2m'
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const getSheetHeaders = () => {
    switch (sheetType) {
      case 'hsxk':
      case 'ndk':
      case 'nsx':
        return ["STT", "Sản phẩm", "Tên Xuất Khẩu", "Quốc gia", "Hạn nộp", "Cảnh báo", "Phân loại", "Ghi chú"];
      case 'hsbs':
        return ["Tên Thuốc", "Tình Trạng", "Số TN", "Hạn ngày BS", "Cảnh báo", "Ghi chú"];
      case 'hsgh':
        return ["Tên Thuốc", "Tình Trạng", "Hạn ngày gia hạn", "Cảnh báo", "Ghi chú"];
      case 'hsm':
        return ["Phân loại", "Tên Thuốc", "Dạng bào chế", "Hoạt chất, hàm lượng", "Tình trạng"];
      case 'hstd':
        return ["Tên Thuốc", "Phân loại", "Nội dung xin thay đổi", "Tình trạng", "Giải trình"];
      default:
        return [];
    }
  };

  const getSheetRows = (files) => {
    return files.map((item, idx) => {
      const days = item.daysDiff;
      let alertText = '—';
      if (days !== null) {
        if (days < 0) alertText = `Quá hạn ${Math.abs(days)} ngày`;
        else if (days <= 30) alertText = `Hết hạn trong ${days} ngày`;
        else if (days <= 60) alertText = `Hết hạn trong ${days} ngày`;
        else alertText = `Còn ${days} ngày`;
      }

      switch (sheetType) {
        case 'hsxk':
        case 'ndk':
        case 'nsx':
          return [
            item.stt || idx + 1,
            item.productName,
            item.exportName || '—',
            item.country || '—',
            item.deadline || '—',
            alertText,
            item.classification || '—',
            item.note || '—'
          ];
        case 'hsbs':
          return [
            item.productName,
            item.status || '—',
            item.tnNumber || '—',
            item.deadline || '—',
            alertText,
            item.note || '—'
          ];
        case 'hsgh':
          return [
            item.productName,
            item.status || '—',
            item.deadline || '—',
            alertText,
            item.note || '—'
          ];
        case 'hsm':
          return [
            item.classification || '—',
            item.productName,
            item.formulation || '—',
            item.ingredients || '—',
            item.status || '—'
          ];
        case 'hstd':
          return [
            item.productName,
            item.classification || '—',
            item.content || '—',
            item.status || '—',
            item.explanation || '—'
          ];
        default:
          return [];
      }
    });
  };

  const handleCopyEmployeeTable = async (employeeName, files) => {
    const headers = getSheetHeaders();
    const rows = getSheetRows(files);
    const success = await copyTableToClipboard(headers, rows);
    if (success) {
      setCopiedEmp(employeeName);
      setTimeout(() => setCopiedEmp(null), 2000);
    }
  };

  // Determine if this sheet has deadlines
  const hasDeadline = ['hsxk', 'ndk', 'nsx', 'hsbs', 'hsgh'].includes(sheetType);

  // Group and count files per employee in this sheet
  // Filter sheetData based on user role (non-admin can only see files they are in charge of)
  const isUserAdmin = user?.role === 'admin';
  const targetFilesData = isUserAdmin 
    ? sheetData 
    : sheetData.filter(item => item.inCharge && item.inCharge.includes(user?.employeeName));

  const getModalData = () => {
    switch (modalType) {
      case 'overdue':
        return targetFilesData.filter(item => item.daysDiff !== null && item.daysDiff < 0);
      case '1m':
        return targetFilesData.filter(item => item.daysDiff !== null && item.daysDiff >= 0 && item.daysDiff <= 30);
      case '2m':
        return targetFilesData.filter(item => item.daysDiff !== null && item.daysDiff > 30 && item.daysDiff <= 60);
      default:
        return [];
    }
  };

  const getModalTitle = () => {
    switch (modalType) {
      case 'overdue': return `Danh sách hồ sơ quá hạn (${sheetName})`;
      case '1m': return `Danh sách hồ sơ sắp hết hạn trong 1 tháng (${sheetName})`;
      case '2m': return `Danh sách hồ sơ sắp hết hạn trong 2 tháng (${sheetName})`;
      default: return 'Chi tiết hồ sơ';
    }
  };

  const filteredModalData = getModalData().filter(item => {
    const pName = item.productName || '';
    const expName = item.exportName || '';
    const inChargeStr = item.inCharge?.join(', ') || '';
    const country = item.country || '';
    const classification = item.classification || '';
    const note = item.note || '';

    return (
      pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inChargeStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCopyModalTable = async () => {
    const headers = getSheetHeaders();
    const rows = getSheetRows(filteredModalData);
    const success = await copyTableToClipboard(headers, rows);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const employeeFiles = {};
  employees.forEach(emp => {
    employeeFiles[emp.fullName] = [];
  });

  targetFilesData.forEach(item => {
    const list = item.inCharge || [];
    list.forEach(name => {
      if (employeeFiles[name] !== undefined) {
        employeeFiles[name].push(item);
      }
    });
  });

  // Calculate statistics for this sheet
  let totalFiles = 0;
  let overdueCount = 0;
  let near1mCount = 0;
  let near2mCount = 0;

  targetFilesData.forEach(item => {
    totalFiles++;
    if (hasDeadline && item.daysDiff !== null) {
      if (item.daysDiff < 0) overdueCount++;
      else if (item.daysDiff <= 30) near1mCount++;
      else if (item.daysDiff <= 60) near2mCount++;
    }
  });

  // Filter employees who have files in this sheet
  const activeEmployees = employees
    .map(emp => ({
      ...emp,
      files: employeeFiles[emp.fullName] || []
    }))
    .filter(emp => {
      const hasFiles = emp.files.length > 0;
      if (!isUserAdmin) {
        return hasFiles && emp.fullName === user?.employeeName;
      }
      return hasFiles;
    })
    // Sort employees by file count descending
    .sort((a, b) => b.files.length - a.files.length);

  // Expand / collapse toggle
  const toggleAccordion = (name) => {
    if (expandedEmployee === name) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(name);
    }
  };

  // Helper to sort files descending (overdue and closest deadline first)
  const sortFiles = (files) => {
    if (!hasDeadline) {
      // Sort HSM / HSTĐ by product name alphabetically
      return [...files].sort((a, b) => a.productName.localeCompare(b.productName));
    }
    // Sort by daysDiff (lowest/most negative first, which represents most overdue/closest deadline)
    return [...files].sort((a, b) => {
      if (a.daysDiff === null) return 1;
      if (b.daysDiff === null) return -1;
      return a.daysDiff - b.daysDiff;
    });
  };

  // Render Table Headers based on Sheet Type
  const renderHeaders = () => {
    switch (sheetType) {
      case 'hsxk':
      case 'ndk':
      case 'nsx':
        return (
          <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
            <th className="pb-3 pl-3">STT</th>
            <th className="pb-3">Sản phẩm</th>
            <th className="pb-3">Tên Xuất Khẩu</th>
            <th className="pb-3">Quốc gia</th>
            <th className="pb-3">Hạn nộp</th>
            <th className="pb-3 text-center">Cảnh báo</th>
            <th className="pb-3">Phân loại</th>
            <th className="pb-3">Ghi chú</th>
          </tr>
        );
      case 'hsbs':
        return (
          <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
            <th className="pb-3 pl-3">Tên Thuốc</th>
            <th className="pb-3">Tình Trạng</th>
            <th className="pb-3">Số TN</th>
            <th className="pb-3">Hạn ngày BS</th>
            <th className="pb-3 text-center">Cảnh báo</th>
            <th className="pb-3">Ghi chú</th>
          </tr>
        );
      case 'hsgh':
        return (
          <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
            <th className="pb-3 pl-3">Tên Thuốc</th>
            <th className="pb-3">Tình Trạng</th>
            <th className="pb-3">Hạn ngày gia hạn</th>
            <th className="pb-3 text-center">Cảnh báo</th>
            <th className="pb-3">Ghi chú</th>
          </tr>
        );
      case 'hsm':
        return (
          <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
            <th className="pb-3 pl-3">Phân loại</th>
            <th className="pb-3">Tên Thuốc</th>
            <th className="pb-3">Dạng bào chế</th>
            <th className="pb-3">Hoạt chất, hàm lượng</th>
            <th className="pb-3">Tình trạng</th>
          </tr>
        );
      case 'hstd':
        return (
          <tr className="border-b border-slate-200 text-slate-400 uppercase text-xxs font-black tracking-wider">
            <th className="pb-3 pl-3">Tên Thuốc</th>
            <th className="pb-3">Phân loại</th>
            <th className="pb-3">Nội dung xin thay đổi</th>
            <th className="pb-3">Tình trạng</th>
            <th className="pb-3">Giải trình</th>
          </tr>
        );
      default:
        return null;
    }
  };

  // Render Table Row based on Sheet Type
  const renderRow = (item, idx) => {
    const days = item.daysDiff;
    let badgeColor = 'bg-slate-100 text-slate-600';
    let alertText = '';

    if (days !== null) {
      if (days < 0) {
        alertText = `Quá hạn ${Math.abs(days)} ngày`;
        badgeColor = 'bg-red-100 text-red-700 font-extrabold border border-red-200';
      } else if (days <= 30) {
        alertText = `Hết hạn trong ${days} ngày`;
        badgeColor = 'bg-amber-100 text-amber-700 font-bold border border-amber-200';
      } else if (days <= 60) {
        alertText = `Hết hạn trong ${days} ngày`;
        badgeColor = 'bg-yellow-100 text-yellow-700 font-bold border border-yellow-200';
      } else {
        alertText = `Còn ${days} ngày`;
        badgeColor = 'bg-slate-100 text-slate-600 font-medium';
      }
    }

    switch (sheetType) {
      case 'hsxk':
      case 'ndk':
      case 'nsx':
        return (
          <tr key={idx} className="hover:bg-slate-50/40 border-b border-slate-100">
            <td className="py-3.5 pl-3 font-semibold text-slate-500">{item.stt || idx + 1}</td>
            <td className="py-3.5 font-bold text-slate-800 pr-4">{item.productName}</td>
            <td className="py-3.5 text-slate-600 text-sm">{item.exportName || '—'}</td>
            <td className="py-3.5 font-semibold text-slate-700">{item.country || '—'}</td>
            <td className="py-3.5 text-slate-500 whitespace-nowrap">{item.deadline || '—'}</td>
            <td className="py-3.5 text-center whitespace-nowrap">
              {days !== null ? (
                <span className={`px-3 py-1.5 rounded-2xl text-xs inline-block ${badgeColor}`}>
                  {alertText}
                </span>
              ) : '—'}
            </td>
            <td className="py-3.5 text-xs text-slate-500 font-semibold">{item.classification || '—'}</td>
            <td className="py-3.5 text-xs text-slate-400 max-w-xxs truncate" title={item.note}>{item.note || '—'}</td>
          </tr>
        );
      case 'hsbs':
        return (
          <tr key={idx} className="hover:bg-slate-50/40 border-b border-slate-100">
            <td className="py-3.5 pl-3 font-bold text-slate-800 pr-4">{item.productName}</td>
            <td className="py-3.5 text-slate-600 text-sm">{item.status || '—'}</td>
            <td className="py-3.5 font-mono text-xs text-slate-500">{item.tnNumber || '—'}</td>
            <td className="py-3.5 text-slate-500 whitespace-nowrap">{item.deadline || '—'}</td>
            <td className="py-3.5 text-center whitespace-nowrap">
              {days !== null ? (
                <span className={`px-3 py-1.5 rounded-2xl text-xs inline-block ${badgeColor}`}>
                  {alertText}
                </span>
              ) : '—'}
            </td>
            <td className="py-3.5 text-xs text-slate-400 max-w-xs truncate" title={item.note}>{item.note || '—'}</td>
          </tr>
        );
      case 'hsgh':
        return (
          <tr key={idx} className="hover:bg-slate-50/40 border-b border-slate-100">
            <td className="py-3.5 pl-3 font-bold text-slate-800 pr-4">{item.productName}</td>
            <td className="py-3.5 text-slate-600 text-sm">{item.status || '—'}</td>
            <td className="py-3.5 text-slate-500 whitespace-nowrap">{item.deadline || '—'}</td>
            <td className="py-3.5 text-center whitespace-nowrap">
              {days !== null ? (
                <span className={`px-3 py-1.5 rounded-2xl text-xs inline-block ${badgeColor}`}>
                  {alertText}
                </span>
              ) : '—'}
            </td>
            <td className="py-3.5 text-xs text-slate-400 max-w-xs truncate" title={item.note}>{item.note || '—'}</td>
          </tr>
        );
      case 'hsm':
        return (
          <tr key={idx} className="hover:bg-slate-50/40 border-b border-slate-100">
            <td className="py-3.5 pl-3 text-xs text-slate-500 font-semibold">{item.classification || '—'}</td>
            <td className="py-3.5 font-bold text-slate-800 pr-4">{item.productName}</td>
            <td className="py-3.5 text-slate-600 text-sm">{item.formulation || '—'}</td>
            <td className="py-3.5 text-xs text-slate-500 font-medium max-w-xs pr-4">{item.ingredients || '—'}</td>
            <td className="py-3.5 text-xs text-indigo-600 font-bold">{item.status || '—'}</td>
          </tr>
        );
      case 'hstd':
        return (
          <tr key={idx} className="hover:bg-slate-50/40 border-b border-slate-100">
            <td className="py-3.5 pl-3 font-bold text-slate-800 pr-4">{item.productName}</td>
            <td className="py-3.5 text-xs text-slate-500 font-semibold">{item.classification || '—'}</td>
            <td className="py-3.5 text-slate-600 text-sm max-w-xs pr-4">{item.content || '—'}</td>
            <td className="py-3.5 text-xs text-amber-600 font-bold whitespace-nowrap">{item.status || '—'}</td>
            <td className="py-3.5 text-xs text-slate-400 max-w-xs" title={item.explanation}>{item.explanation || '—'}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{sheetName}</h1>
        <p className="text-slate-500 mt-2 text-base">Xem chi tiết các hồ sơ được phân công phụ trách cho từng nhân viên.</p>
      </div>

      {/* Sheet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-card rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số hồ sơ</span>
            <h4 className="text-3xl font-extrabold text-slate-800 mt-1">{totalFiles}</h4>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
            <ClipboardList size={22} />
          </div>
        </div>

        {hasDeadline && (
          <>
            <div 
              onClick={() => {
                if (overdueCount > 0) {
                  setModalType('overdue');
                  setSearchTerm('');
                  setModalOpen(true);
                }
              }}
              className={`glass-card rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all duration-200 ${overdueCount > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] border-red-200/50 hover:bg-red-50/10' : ''}`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đã quá hạn</span>
                <h4 className={`text-3xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>{overdueCount}</h4>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                <AlertTriangle size={22} />
              </div>
            </div>

            <div 
              onClick={() => {
                if (near1mCount > 0) {
                  setModalType('1m');
                  setSearchTerm('');
                  setModalOpen(true);
                }
              }}
              className={`glass-card rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all duration-200 ${near1mCount > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] border-amber-200/50 hover:bg-amber-50/10' : ''}`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hạn dưới 1 tháng</span>
                <h4 className={`text-3xl font-extrabold mt-1 ${near1mCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>{near1mCount}</h4>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${near1mCount > 0 ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
                <CalendarClock size={22} />
              </div>
            </div>

            <div 
              onClick={() => {
                if (near2mCount > 0) {
                  setModalType('2m');
                  setSearchTerm('');
                  setModalOpen(true);
                }
              }}
              className={`glass-card rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all duration-200 ${near2mCount > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] border-yellow-200/50 hover:bg-yellow-50/10' : ''}`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hạn 1 - 2 tháng</span>
                <h4 className={`text-3xl font-extrabold mt-1 ${near2mCount > 0 ? 'text-yellow-600' : 'text-slate-800'}`}>{near2mCount}</h4>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${near2mCount > 0 ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-400'}`}>
                <CalendarClock size={22} />
              </div>
            </div>
          </>
        )}

      </div>

      {/* Accordion Table container */}
      <div className="space-y-4">
        {activeEmployees.map((emp) => {
          const isExpanded = expandedEmployee === emp.fullName;
          const sortedEmpFiles = sortFiles(emp.files);

          return (
            <div 
              key={emp.fullName} 
              className="glass-card rounded-3xl overflow-hidden border border-white/50 shadow-sm transition-all"
            >
              
              {/* Accordion Header */}
              <button
                onClick={() => toggleAccordion(emp.fullName)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{emp.fullName}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="px-3.5 py-1.5 bg-sky-50 text-sky-700 font-extrabold text-sm rounded-full">
                    {emp.files.length} hồ sơ
                  </span>
                  {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
              </button>

              {/* Accordion Content (Table) */}
              {isExpanded && (
                <div className="border-t border-slate-100/50 bg-white/40 p-6 animate-fade-in overflow-x-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách chi tiết</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyEmployeeTable(emp.fullName, sortedEmpFiles);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xxs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      {copiedEmp === emp.fullName ? <Check size={12} /> : <Copy size={12} />}
                      {copiedEmp === emp.fullName ? 'Đã sao chép!' : 'Sao chép bảng'}
                    </button>
                  </div>
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      {renderHeaders()}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedEmpFiles.map((file, fileIdx) => renderRow(file, fileIdx))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          );
        })}

        {activeEmployees.length === 0 && (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-400 font-semibold shadow-sm">
            Không có hồ sơ nào được ghi nhận cho nhân sự trong bảng này.
          </div>
        )}
      </div>

      {/* Modal for detailed lists when clicking stats cards */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl glass-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{getModalTitle()}</h3>
                <p className="text-xs text-slate-400 mt-1">Đã lọc danh sách hồ sơ chi tiết theo quyền của bạn.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100/50 bg-white/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Search className="text-slate-400 shrink-0" size={20} />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, nhân viên, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-semibold"
                />
              </div>
              <button
                onClick={handleCopyModalTable}
                className="px-4 py-2 bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã sao chép!' : 'Sao chép bảng'}
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredModalData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold">
                  Không tìm thấy hồ sơ nào khớp với điều kiện tìm kiếm.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      {renderHeaders()}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalData.map((item, idx) => renderRow(item, idx))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-700 font-bold rounded-2xl active:scale-[0.98] transition-all text-sm"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
