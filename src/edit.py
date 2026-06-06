import os

file_path = r'd:\Project\Skytree\Website\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# 1. Replace confirmPayment and processFinalPayment logic
start_idx_funcs = -1
end_idx_funcs = -1
for i, line in enumerate(lines):
    if line.strip() == 'const confirmPayment = () => {':
        start_idx_funcs = i
        break

if start_idx_funcs != -1:
    for i in range(start_idx_funcs, len(lines)):
        if "const handleLogout = () => {" in lines[i]:
            end_idx_funcs = i - 1
            break

# 2. Find the Progress bar logic to update it
start_idx_prog = -1
end_idx_prog = -1
for i, line in enumerate(lines):
    if line.strip() == '<div className="modal-progress">':
        start_idx_prog = i
        break
if start_idx_prog != -1:
    for i in range(start_idx_prog, len(lines)):
        if line.strip() == '<div className={`progress-step ${paymentStep >= 2 ? \'active\' : \'\'}`}>2</div>':
            lines.pop(i) # remove the step 2 active
            break

start_idx_prog_line2 = -1
for i, line in enumerate(lines):
    if start_idx_prog != -1 and i > start_idx_prog and line.strip() == '<div className="modal-progress">':
        # re-evaluate
        pass

# simpler approach: Just do index operations based on unique substrings
new_funcs = [
    "  const handleRazorpayPayment = async () => {",
    "    const amount = parseFloat(addFundsAmount);",
    "    if (isNaN(amount) || amount <= 0) {",
    "      alert('Please enter a valid amount');",
    "      return;",
    "    }",
    "",
    "    const res = await new Promise((resolve) => {",
    "      if ((window as any).Razorpay) {",
    "        resolve(true);",
    "        return;",
    "      }",
    "      const script = document.createElement('script');",
    "      script.src = 'https://checkout.razorpay.com/v1/checkout.js';",
    "      script.onload = () => resolve(true);",
    "      script.onerror = () => resolve(false);",
    "      document.body.appendChild(script);",
    "    });",
    "",
    "    if (!res) {",
    "      alert('Razorpay SDK failed to load. Are you online?');",
    "      return;",
    "    }",
    "",
    "    const options = {",
    "      key: 'rzp_test_TYxxQkZzzXzzZZ', // Dummy test key for simulation",
    "      amount: (amount * 100).toString(), ",
    "      currency: 'INR',",
    "      name: 'Skytree Admin Portal',",
    "      description: 'Wallet Recharge',",
    "      theme: { color: '#3b82f6' },",
    "      handler: function (response: any) {",
    "        const newTransaction = {",
    "          id: Date.now(),",
    "          type: 'Credit',",
    "          amount: amount,",
    "          date: new Date().toISOString().split('T')[0],",
    "          status: 'Success',",
    "          description: `Added Funds via Razorpay (ID: ${response.razorpay_payment_id})`",
    "        };",
    "",
    "        const updatedBalance = (currentUser.walletBalance || 0) + amount;",
    "        const updatedUser = {",
    "          ...currentUser,",
    "          walletBalance: updatedBalance,",
    "          transactions: [newTransaction, ...(currentUser.transactions || [])]",
    "        };",
    "",
    "        setCurrentUser(updatedUser);",
    "        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));",
    "        localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));",
    "        ",
    "        setPaymentStep(4);",
    "      },",
    "      prefill: {",
    "        name: currentUser?.name || 'User',",
    "        email: currentUser?.email || 'user@email.com',",
    "        contact: currentUser?.phone || '9999999999',",
    "      },",
    "    };",
    "",
    "    const paymentObject = new (window as any).Razorpay(options);",
    "    paymentObject.on('payment.failed', function (response: any) {",
    "      alert(`Payment failed! Reason: ${response.error.description}`);",
    "    });",
    "    paymentObject.open();",
    "  };"
]

if start_idx_funcs != -1 and end_idx_funcs != -1:
    lines = lines[:start_idx_funcs] + new_funcs + lines[end_idx_funcs:]

# Find button logic and paymentStep 2
start_idx_btn = -1
end_idx_btn = -1
for i, line in enumerate(lines):
    if line.strip() == '<button className="btn-primary w-full" style={{ marginTop: \'24px\' }} onClick={() => setPaymentStep(2)}>':
        start_idx_btn = i
        break

if start_idx_btn != -1:
    for i in range(start_idx_btn, len(lines)):
        if line.strip() == '{paymentStep === 4 && (':
            end_idx_btn = i - 1
            break

if start_idx_btn != -1 and end_idx_btn != -1:
    lines = lines[:start_idx_btn] + [
        "                  <button className=\"btn-primary w-full\" style={{ marginTop: '24px' }} onClick={handleRazorpayPayment}>",
        "                    Continue to Payment",
        "                  </button>",
        "                </div>",
        "              )}"
    ] + [""] + lines[end_idx_btn+1:]

# Remove progress step 2
for i, line in enumerate(lines):
    if line.strip() == '<div className={`progress-step ${paymentStep >= 2 ? \'active\' : \'\'}`}>2</div>':
        lines.pop(i)
        break
for i, line in enumerate(lines):
    if line.strip() == '<div className="progress-line"></div>' and "progress-step ${paymentStep >= 4" in lines[i+1]:
        lines.pop(i) # remove duplicate line
        break

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print("Done")
