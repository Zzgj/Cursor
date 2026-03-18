-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePass" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetCode" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'laptop',
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "os" TEXT,
    "cpu" TEXT,
    "memory" TEXT,
    "storage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "currentUserName" TEXT,
    "departmentId" INTEGER,
    "purchaseDate" DATETIME,
    "warrantyExpiry" DATETIME,
    "remark" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "userName" TEXT,
    "departmentId" INTEGER,
    "actionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" DATETIME,
    "proofImage" TEXT,
    "remark" TEXT,
    "operatorId" INTEGER NOT NULL,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssetRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepairRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "faultDescription" TEXT NOT NULL,
    "repairVendor" TEXT,
    "repairCost" REAL,
    "repairResult" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "operatorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER,
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRecord_requestId_key" ON "AssetRecord"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");
