import { initialReceivingRecords } from "../features/data/receivingData";

const STORAGE_KEY = "stock_management_receiving";

export function getReceivingRecords() {
  const storedData = localStorage.getItem(STORAGE_KEY);

  if (storedData) {
    return JSON.parse(storedData);
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(initialReceivingRecords)
  );

  return initialReceivingRecords;
}

export function saveReceivingRecords(records) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records)
  );
}

export function getReceivingById(id) {
  const records = getReceivingRecords();

  return records.find((record) => record.id === id);
}

export function createReceivingRecord(record) {
  const records = getReceivingRecords();

  const newRecord = {
    ...record,
    id: `REC-${Date.now()}`,
    status: "Pending Evaluation",
    evaluation: null,
    grn: null,
    inventoryUpdated: false,
    binCardUpdated: false,
    stockRecordUpdated: false,
  };

  const updatedRecords = [
    newRecord,
    ...records,
  ];

  saveReceivingRecords(updatedRecords);

  return newRecord;
}

export function updateReceivingRecord(id, updates) {
  const records = getReceivingRecords();

  const updatedRecords = records.map((record) =>
    record.id === id
      ? {
          ...record,
          ...updates,
        }
      : record
  );

  saveReceivingRecords(updatedRecords);

  return updatedRecords.find(
    (record) => record.id === id
  );
}

export function deleteReceivingRecords() {
  localStorage.removeItem(STORAGE_KEY);
}