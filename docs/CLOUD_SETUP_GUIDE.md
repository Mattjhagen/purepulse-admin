# 🛠️ Step-by-Step Setup Guide: AWS & Azure Cloud Runner Integration

This guide walks you through connecting your **AWS** and **Microsoft Azure** accounts to the **Server Handoff Command Center** so secondary build runners can spin up automatically during peak project volume or GCP failovers.

---

## 1. 🍊 Amazon Web Services (AWS EC2 Runner Setup)

### Step 1: Create an IAM User for the Runner
1. Log into your [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **IAM** (Identity and Access Management) → **Users** → **Create user**.
3. Set the username to **`purepulse-aws-runner`** and click **Next**.
4. Under **Permissions options**, select **Attach policies directly**.
5. Search for and check **`AmazonEC2FullAccess`** (allows launching/terminating EC2 Spot instances).
6. Click **Next** → **Create user**.

### Step 2: Generate Access Keys
1. Click on the newly created user **`purepulse-aws-runner`**.
2. Go to the **Security credentials** tab.
3. Scroll down to **Access keys** and click **Create access key**.
4. Choose **Command Line Interface (CLI)**, check the agreement box, and click **Next**.
5. Copy your **Access Key ID** and **Secret Access Key**.

### Step 3: Save AWS Credentials on VM
Add your keys to `/root/.config/aws-runner-dev.env` on `server-handoff-cloud`:
```bash
AWS_ACCESS_KEY_ID="AKIAxxxxxxxxxxxxxxxx"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_DEFAULT_REGION="us-east-1"
```

---

## 2. 🔷 Microsoft Azure (Azure VM Runner Setup)

### Step 1: Register an App (Service Principal) in Azure
1. Log into the [Azure Portal](https://portal.azure.com/).
2. Search for **Microsoft Entra ID** (formerly Azure Active Directory) → **App registrations** → **New registration**.
3. Name the app **`PurePulse-Azure-Runner`** and click **Register**.
4. Copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.

### Step 2: Create a Client Secret
1. Under your registered app, click **Certificates & secrets** in the left menu.
2. Click **New client secret**, set Description to `CommandCenterKey`, select expiration (e.g. 12 months), and click **Add**.
3. Copy the **Value** of the client secret immediately (it won't be shown again).

### Step 3: Grant Subscription Contributor Access
1. Search for **Subscriptions** in the top search bar and click your subscription.
2. Copy your **Subscription ID**.
3. Click **Access control (IAM)** → **Add** → **Add role assignment**.
4. Select the **Contributor** role, click **Next**.
5. Select **User, group, or service principal**, click **Select members**, search for `PurePulse-Azure-Runner`, and click **Save**.

### Step 4: Save Azure Credentials on VM
Add your Azure keys to `/root/.config/azure-runner-dev.env` on `server-handoff-cloud`:
```bash
AZURE_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
AZURE_CLIENT_ID="00000000-0000-0000-0000-000000000000"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
```

---

## 3. 🧪 Testing the 3-Node Runner Cluster

Once credentials are in place, you can test each runner node individually from your Mac or server terminal:

### Test GCP Primary Runner:
```bash
ssh server-handoff-cloud "sudo opencode run 'echo GCP Primary Node Active'"
```

### Test AWS Fallback Runner:
```bash
/home/matt/Projects/scripts/cloud-runner-aws.sh "test-project-1"
```

### Test Azure Fallback Runner:
```bash
/home/matt/Projects/scripts/cloud-runner-azure.sh "test-project-2"
```

---

## 🎛️ Command Center Status View
Once credentials are added, open **`https://tty-purepulse.relayapp.pro`** to monitor all 3 nodes live:
- **Column 1**: `google-cloud-vm` (GCP Primary)
- **Column 2**: `aws-ec2-runner` (AWS Fallback 1)
- **Column 3**: `azure-vm-runner` (Azure Fallback 2)
