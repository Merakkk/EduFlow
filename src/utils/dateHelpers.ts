/**
 * Indonesian date helper functions for student planner
 */

export const getDayDifference = (date1Str: string, date2Str: string): number => {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  
  // Set times to midnight to calculate pure day differences
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${dayNum} ${monthName} ${year}`;
};

export const formatIndonesianShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayNum} ${monthName} ${year}`;
};

export const getDeadlineAlert = (deadlineStr: string, todayStr: string, status: string) => {
  if (status === 'Selesai') return null;

  const diff = getDayDifference(deadlineStr, todayStr);

  if (diff < 0) {
    return {
      type: 'danger' as const,
      text: `Terlambat ${Math.abs(diff)} hari`,
      days: diff
    };
  } else if (diff === 0) {
    return {
      type: 'danger' as const,
      text: 'Hari ini!',
      days: diff
    };
  } else if (diff === 1) {
    return {
      type: 'danger' as const,
      text: 'Besok! (H-1)',
      days: diff
    };
  } else if (diff <= 3) {
    return {
      type: 'warning' as const,
      text: `${diff} hari lagi (H-3)`,
      days: diff
    };
  } else if (diff <= 7) {
    return {
      type: 'info' as const,
      text: `${diff} hari lagi (H-7)`,
      days: diff
    };
  }

  return null;
};
