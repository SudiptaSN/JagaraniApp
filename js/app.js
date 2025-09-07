// --- PWA Service Worker Registration (Updated for GitHub Pages) ---
if ('serviceWorker' in navigator) {
    // The path must match the location of sw.js relative to the root of the domain
    navigator.serviceWorker.register('/JagaraniApp/sw.js', {
        scope: '/JagaraniApp/' // The scope must match the start_url in manifest.json
    }).then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
    });
}


// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const App = {
        // --- STATE MANAGEMENT ---
        state: {
            currentFinancialYear: null,
            data: {}, // All data for the current year
            assetChart: null,
            contributorChart: null,
            focusTrapHandler: null,
        },

        // --- CONSTANTS ---
        LOAN_INTEREST_RATE: 0.02,
        FD_INTEREST_RATE: 0.015,
        LATE_FEE_RATE: 0.05,
        STORAGE_PREFIX: 'jagaraniCoOpData_',
        MONTHS: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],

        // --- INITIALIZATION ---
        init() {
            this.initFinancialYear();
            this.bindEventListeners();
            this.loadDataForYear(this.state.currentFinancialYear);
            this.render();
        },
        
        // --- FINANCIAL YEAR MANAGEMENT ---
        initFinancialYear() {
            const availableYears = this.getAvailableFinancialYears();
            const selector = document.getElementById('financialYearSelector');
            selector.innerHTML = '';
            
            if (availableYears.length === 0) {
                const defaultYear = this.generateFinancialYearLabel(new Date());
                availableYears.push(defaultYear);
                this.saveDataForYear(defaultYear, this.getNewYearDataStructure());
            }

            availableYears.sort().reverse().forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                selector.appendChild(option);
            });

            this.state.currentFinancialYear = localStorage.getItem('jagaraniCurrentYear') || availableYears[0];
            selector.value = this.state.currentFinancialYear;
        },

        getAvailableFinancialYears() {
            const years = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.STORAGE_PREFIX)) {
                    years.push(key.replace(this.STORAGE_PREFIX, ''));
                }
            }
            return years;
        },

        generateFinancialYearLabel(date) {
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            if (month >= 8) { // Financial year starts in September (month 8)
                return `${year}-${year + 1}`;
            } else {
                return `${year - 1}-${year}`;
            }
        },
        
        loadDataForYear(year) {
            const storedData = localStorage.getItem(this.STORAGE_PREFIX + year);
            this.state.data = storedData ? JSON.parse(storedData) : this.getNewYearDataStructure();
            localStorage.setItem('jagaraniCurrentYear', year);
            this.state.currentFinancialYear = year;
        },

        saveDataForYear(year, data) {
            localStorage.setItem(this.STORAGE_PREFIX + year, JSON.stringify(data));
        },
        
        saveCurrentData() {
            this.saveDataForYear(this.state.currentFinancialYear, this.state.data);
        },
        
        getNewYearDataStructure(openingBalances = { online: 0, offline: 0 }) {
            return {
                members: [],
                loans: [],
                fds: [],
                contributions: {},
                openingBalances: openingBalances
            };
        },

        // --- EVENT BINDING ---
        bindEventListeners() {
            document.getElementById('tabs').addEventListener('click', e => {
                if (e.target.matches('.tab-button')) this.switchTab(e.target.dataset.tab);
            });
            document.getElementById('financialYearSelector').addEventListener('change', e => {
                this.loadDataForYear(e.target.value);
                this.render();
            });
            document.getElementById('manageYearsBtn').addEventListener('click', () => this.showManageYearsModal());
            document.getElementById('backupDataBtn').addEventListener('click', () => this.backupData());
            document.getElementById('restoreDataInput').addEventListener('change', e => this.restoreData(e));
            document.getElementById('addMemberBtn').addEventListener('click', () => this.showMemberModal());
            document.getElementById('viewMembersBtn').addEventListener('click', () => this.switchMemberView('membersListView'));
            document.getElementById('viewContributionsBtn').addEventListener('click', () => this.switchMemberView('contributionsView'));
            document.getElementById('addLoanBtn').addEventListener('click', () => this.showLoanModal());
            document.getElementById('addFdBtn').addEventListener('click', () => this.showFdModal());
        },

        // --- UI RENDERING & UPDATES ---
        render() {
            this.renderDashboard();
            this.renderMembers();
            this.renderLoans();
            this.renderFds();
            this.renderContributions();
        },
        
        switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById(tabId).classList.remove('hidden');
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
        },

        switchMemberView(viewId) {
            const isMembersList = viewId === 'membersListView';
            document.getElementById('membersListView').classList.toggle('hidden', !isMembersList);
            document.getElementById('contributionsView').classList.toggle('hidden', isMembersList);
            
            document.getElementById('viewMembersBtn').classList.toggle('text-indigo-600', isMembersList);
            document.getElementById('viewMembersBtn').classList.toggle('border-indigo-600', isMembersList);
            document.getElementById('viewMembersBtn').classList.toggle('text-gray-500', !isMembersList);

            document.getElementById('viewContributionsBtn').classList.toggle('text-indigo-600', !isMembersList);
            document.getElementById('viewContributionsBtn').classList.toggle('border-indigo-600', !isMembersList);
            document.getElementById('viewContributionsBtn').classList.toggle('text-gray-500', isMembersList);
        },

        renderDashboard() {
            const calculations = this.calculateFinancials();
            const onlineEl = document.getElementById('kpiOnlineBalance');
            const offlineEl = document.getElementById('kpiOfflineBalance');
            const profitEl = document.getElementById('kpiProfitLoss');

            onlineEl.textContent = this.formatCurrency(calculations.onlineBalance, true);
            onlineEl.classList.toggle('text-red-500', calculations.onlineBalance < 0);
            
            offlineEl.textContent = this.formatCurrency(calculations.offlineBalance, true);
            offlineEl.classList.toggle('text-red-500', calculations.offlineBalance < 0);

            profitEl.textContent = this.formatCurrency(calculations.totalProfit, true);
            profitEl.classList.toggle('text-red-500', calculations.totalProfit < 0);

            document.getElementById('kpiActiveLoans').textContent = this.formatCurrency(calculations.activeLoansValue);
            this.renderAssetAllocationChart(calculations);
        },
        
        renderMembers() {
            const calculations = this.calculateFinancials();
            const membersTable = document.getElementById('membersTable');
            membersTable.innerHTML = '';
            
            if (this.state.data.members.length === 0) {
                membersTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No members found.</td></tr>`;
                this.renderTopContributorsChart([]);
                return;
            }

            this.state.data.members.forEach(member => {
                const memberContribution = calculations.memberContributions[member.id] || 0;
                const contributionPercent = calculations.totalContributions > 0 ? (memberContribution / calculations.totalContributions) * 100 : 0;
                const profitShare = calculations.totalProfit * (contributionPercent / 100);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatCurrency(memberContribution)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contributionPercent.toFixed(2)}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${profitShare < 0 ? 'text-red-500' : ''}">${this.formatCurrency(profitShare, true)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-member-btn" data-id="${member.id}">Edit</button>
                    </td>
                `;
                membersTable.appendChild(row);
            });
            
            membersTable.querySelectorAll('.edit-member-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.showMemberModal(e.target.dataset.id));
            });
            
            const sortedMembers = [...this.state.data.members].map(m => ({...m, contribution: calculations.memberContributions[m.id] || 0})).sort((a,b) => b.contribution - a.contribution).slice(0, 10);
            this.renderTopContributorsChart(sortedMembers);
        },

        renderLoans() {
            const loansTable = document.getElementById('loansTable');
            loansTable.innerHTML = '';
             if (this.state.data.loans.length === 0) {
                loansTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No loans found.</td></tr>`;
                return;
            }
            this.state.data.loans.forEach(loan => {
                const member = this.state.data.members.find(m => m.id === loan.memberId);
                const statusClass = loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member ? member.name : 'Unknown Member'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatCurrency(loan.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${loan.issueDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${loan.status}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-loan-btn" data-id="${loan.id}">Edit</button>
                    </td>
                `;
                loansTable.appendChild(row);
            });
            loansTable.querySelectorAll('.edit-loan-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.showLoanModal(e.target.dataset.id));
            });
        },
        
        renderFds() {
            const fdsTable = document.getElementById('fdsTable');
            fdsTable.innerHTML = '';
             if (this.state.data.fds.length === 0) {
                fdsTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No FDs found.</td></tr>`;
                return;
            }
            this.state.data.fds.forEach(fd => {
                const member = this.state.data.members.find(m => m.id === fd.memberId);
                 const statusClass = fd.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member ? member.name : 'Unknown Member'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatCurrency(fd.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${fd.startDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${fd.status}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-fd-btn" data-id="${fd.id}">Edit</button>
                    </td>
                `;
                fdsTable.appendChild(row);
            });
            fdsTable.querySelectorAll('.edit-fd-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.showFdModal(e.target.dataset.id));
            });
        },
        
        renderContributions() {
            const header = document.getElementById('contributionsHeader');
            const body = document.getElementById('contributionsTable');
            
            header.innerHTML = `<tr><th class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Member</th>${this.MONTHS.map(m => `<th class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">${m}</th>`).join('')}</tr>`;
            
            body.innerHTML = '';
            if(this.state.data.members.length === 0) {
                body.innerHTML = `<tr><td colspan="${this.MONTHS.length + 1}" class="text-center py-4 text-gray-500">No members to show contributions for.</td></tr>`;
                return;
            }

            this.state.data.members.forEach(member => {
                const row = document.createElement('tr');
                let cells = `<td class="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">${member.name}</td>`;
                this.MONTHS.forEach((month, index) => {
                    const contribution = this.state.data.contributions[member.id]?.[index];
                    const isPaid = !!contribution;
                    const lateFeeIndicator = (contribution && contribution.lateFee > 0) 
                        ? `<span class="text-red-500 font-bold ml-1" title="Late Fee Paid: ${this.formatCurrency(contribution.lateFee)}">!</span>` 
                        : '';

                    cells += `<td class="px-2 py-4 text-center">
                        <div class="flex items-center justify-center">
                            <input type="checkbox" class="contribution-checkbox h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" 
                                ${isPaid ? 'checked' : ''} 
                                data-member-id="${member.id}" 
                                data-month-index="${index}">
                            ${lateFeeIndicator}
                        </div>
                    </td>`;
                });
                row.innerHTML = cells;
                body.appendChild(row);
            });
            
            body.querySelectorAll('.contribution-checkbox').forEach(box => {
                box.addEventListener('click', (e) => {
                    e.preventDefault();
                    const memberId = e.target.dataset.memberId;
                    const monthIndex = parseInt(e.target.dataset.monthIndex, 10);
                    const isAlreadyPaid = !!this.state.data.contributions[memberId]?.[monthIndex];
                    if (isAlreadyPaid) this.showEditContributionModal(memberId, monthIndex);
                    else this.showContributionModal(memberId, monthIndex);
                });
            });
        },
        
        // --- CHART RENDERING ---
        renderAssetAllocationChart(calculations) {
            const ctx = document.getElementById('assetAllocationChart').getContext('2d');
            const data = {
                labels: ['Online Cash', 'Offline Cash', 'Active Loans', 'FD Investments'],
                datasets: [{
                    data: [
                        calculations.onlineBalance > 0 ? calculations.onlineBalance : 0,
                        calculations.offlineBalance > 0 ? calculations.offlineBalance : 0,
                        calculations.activeLoansValue,
                        calculations.activeFdsValue
                    ],
                    backgroundColor: ['#4f46e5', '#3b82f6', '#f59e0b', '#10b981'],
                }]
            };
            
            if (this.state.assetChart) {
                this.state.assetChart.data = data;
                this.state.assetChart.update();
            } else {
                this.state.assetChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }
        },
        
        renderTopContributorsChart(sortedMembers) {
             const ctx = document.getElementById('topContributorsChart').getContext('2d');
             const data = {
                labels: sortedMembers.map(m => m.name),
                datasets: [{
                    label: 'Total Contribution',
                    data: sortedMembers.map(m => m.contribution),
                    backgroundColor: '#4f46e5',
                    borderColor: '#312e81',
                    borderWidth: 1
                }]
            };

            if (this.state.contributorChart) {
                this.state.contributorChart.data = data;
                this.state.contributorChart.update();
            } else {
                this.state.contributorChart = new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                         plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true } }
                    }
                });
            }
        },

        // --- FINANCIAL CALCULATIONS (REWRITTEN) ---
        calculateFinancials() {
            let onlineBalance = this.state.data.openingBalances.online;
            let offlineBalance = this.state.data.openingBalances.offline;
            let totalLoanInterest = 0;
            let totalFdInterest = 0;
            let totalLateFees = 0;
            let activeLoansValue = 0;
            let activeFdsValue = 0;
            let totalContributions = 0;
            const memberContributions = {};

            const [startYear, endYear] = this.state.currentFinancialYear.split('-').map(Number);
            const fyStartDate = new Date(Date.UTC(startYear, 8, 1));
            const fyEndDate = new Date(Date.UTC(endYear, 7, 31, 23, 59, 59));

            // 1. Process simple cash-in: Contributions
            for (const memberId in this.state.data.contributions) {
                memberContributions[memberId] = 0;
                for (const monthIndex in this.state.data.contributions[memberId]) {
                    const c = this.state.data.contributions[memberId][monthIndex];
                    const member = this.state.data.members.find(m => m.id === memberId);
                    if (member) {
                        const contributionAmount = parseFloat(member.monthlyContribution);
                        const totalPaid = contributionAmount + (c.lateFee || 0);
                        
                        if (c.mode === 'Offline') offlineBalance += totalPaid;
                        else onlineBalance += totalPaid;
                        
                        totalContributions += contributionAmount;
                        memberContributions[memberId] += contributionAmount;
                        if (c.lateFee > 0) totalLateFees += c.lateFee;
                    }
                }
            }

            // 2. Process complex cash-flow and P/L for Loans
            this.state.data.loans.forEach(loan => {
                const loanAmount = parseFloat(loan.amount);
                
                // CASH OUT: Disbursement
                if (loan.disbursementMode === 'Offline') offlineBalance -= loanAmount;
                else onlineBalance -= loanAmount;

                // CASH IN: Repayment
                if (loan.status === 'closed' && loan.repaymentMode && loan.closeDate) {
                    const issueDate = new Date(loan.issueDate + 'T00:00:00Z');
                    const actualCloseDate = new Date(loan.closeDate + 'T00:00:00Z');
                    const totalMonths = this.calculateMonthsBetween(issueDate, actualCloseDate);
                    const totalInterestOnLoan = loanAmount * this.LOAN_INTEREST_RATE * totalMonths;
                    const repaymentAmount = loanAmount + totalInterestOnLoan;

                    if (loan.repaymentMode === 'Offline') offlineBalance += repaymentAmount;
                    else onlineBalance += repaymentAmount;
                }

                // P/L and KPI Calculation
                if (loan.status === 'active') activeLoansValue += loanAmount;

                const issueDate = new Date(loan.issueDate + 'T00:00:00Z');
                const closeDate = (loan.status === 'closed' && loan.closeDate) ? new Date(loan.closeDate + 'T00:00:00Z') : null;
                const periodStart = issueDate > fyStartDate ? issueDate : fyStartDate;
                const periodEnd = (closeDate && closeDate < fyEndDate) ? closeDate : fyEndDate;
                
                if (periodEnd >= periodStart) {
                    const monthsInFy = this.calculateMonthsBetween(periodStart, periodEnd);
                    totalLoanInterest += loanAmount * this.LOAN_INTEREST_RATE * monthsInFy;
                }
            });

            // 3. Process complex cash-flow and P/L for FDs
            this.state.data.fds.forEach(fd => {
                const fdAmount = parseFloat(fd.amount);
                
                // CASH IN: Investment
                if (fd.investmentMode === 'Offline') offlineBalance += fdAmount;
                else onlineBalance += fdAmount;

                // CASH OUT: Payout
                if (fd.status === 'closed' && fd.payoutMode && fd.closeDate) {
                    const startDate = new Date(fd.startDate + 'T00:00:00Z');
                    const actualCloseDate = new Date(fd.closeDate + 'T00:00:00Z');
                    const totalMonths = this.calculateMonthsBetween(startDate, actualCloseDate);
                    const totalInterestOnFd = fdAmount * this.FD_INTEREST_RATE * totalMonths;
                    const payoutAmount = fdAmount + totalInterestOnFd;
                    
                    if (fd.payoutMode === 'Offline') offlineBalance -= payoutAmount;
                    else onlineBalance -= payoutAmount;
                }

                // P/L and KPI Calculation
                if (fd.status === 'active') activeFdsValue += fdAmount;
                
                const startDate = new Date(fd.startDate + 'T00:00:00Z');
                const closeDate = (fd.status === 'closed' && fd.closeDate) ? new Date(fd.closeDate + 'T00:00:00Z') : null;
                const periodStart = startDate > fyStartDate ? startDate : fyStartDate;
                const periodEnd = (closeDate && closeDate < fyEndDate) ? closeDate : fyEndDate;

                if (periodEnd >= periodStart) {
                    const monthsInFy = this.calculateMonthsBetween(periodStart, periodEnd);
                    totalFdInterest += fdAmount * this.FD_INTEREST_RATE * monthsInFy;
                }
            });

            const totalProfit = (totalLoanInterest + totalLateFees) - totalFdInterest;

            return {
                onlineBalance,
                offlineBalance,
                totalProfit,
                activeLoansValue,
                activeFdsValue,
                totalContributions,
                memberContributions
            };
        },
        
        // --- MODAL FACTORY & MANAGEMENT ---
        showModal(config) {
            this.closeModal();
            document.body.classList.add('modal-open');
            const template = document.getElementById('genericModalTemplate');
            const clone = template.content.cloneNode(true);
            const modal = clone.querySelector('#modal-backdrop');
            modal.querySelector('#modal-title').textContent = config.title;
            modal.querySelector('#modal-body').innerHTML = config.body;
            const footer = modal.querySelector('#modal-footer');
            footer.innerHTML = '';
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300';
            cancelBtn.onclick = () => this.closeModal();
            footer.appendChild(cancelBtn);
            if (config.action) {
                const actionBtn = document.createElement('button');
                actionBtn.id = 'modal-action-btn';
                actionBtn.textContent = config.action.label;
                actionBtn.className = config.action.classes || 'py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700';
                actionBtn.onclick = config.action.callback;
                footer.insertBefore(actionBtn, footer.firstChild);
            }
            document.getElementById('modalContainer').appendChild(clone);
            this.trapFocus(document.getElementById('modal-backdrop'));
        },
        
        closeModal() {
             const modal = document.getElementById('modal-backdrop');
             if (modal) {
                 document.body.classList.remove('modal-open');
                 if (this.state.focusTrapHandler) {
                     document.removeEventListener('keydown', this.state.focusTrapHandler);
                     this.state.focusTrapHandler = null;
                 }
                 modal.classList.add('modal-leave');
                 modal.addEventListener('animationend', () => modal.remove(), { once: true });
             }
        },

        // --- SPECIFIC MODAL IMPLEMENTATIONS ---
        showMemberModal(memberId = null) {
            const isEditing = memberId !== null;
            const member = isEditing ? this.state.data.members.find(m => m.id === memberId) : null;
            const title = isEditing ? 'Edit Member' : 'Add New Member';
            let body = `
                <div>
                    <label for="memberName" class="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="memberName" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value="${member ? member.name : ''}" required>
                </div>
                <div class="mt-4">
                    <label for="monthlyContribution" class="block text-sm font-medium text-gray-700">Monthly Contribution (₹)</label>
                    <input type="number" id="monthlyContribution" min="0" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value="${member ? member.monthlyContribution : ''}" required>
                </div>
            `;
            if (isEditing) {
                body += `
                    <div class="mt-6 border-t pt-4">
                        <h4 class="text-md font-semibold text-red-600">Danger Zone</h4>
                        <p class="text-sm text-gray-500 mt-1">To delete this member, type <strong class="text-red-700">DELETE MEMBER</strong> below.</p>
                        <input type="text" id="deleteConfirmation" class="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="DELETE MEMBER">
                        <button id="deleteMemberBtn" class="mt-2 w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled>Delete Permanently</button>
                    </div>
                `;
            }
            this.showModal({
                title: title, body: body,
                action: { label: isEditing ? 'Save Changes' : 'Add Member', callback: () => this.handleSaveMember(memberId) }
            });
            if(isEditing) {
                const confirmInput = document.getElementById('deleteConfirmation');
                const deleteBtn = document.getElementById('deleteMemberBtn');
                confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value !== 'DELETE MEMBER'; });
                deleteBtn.addEventListener('click', () => this.handleDeleteMember(memberId));
            }
        },
        
        showLoanModal(loanId = null) {
            const isEditing = loanId !== null;
            const loan = isEditing ? this.state.data.loans.find(l => l.id === loanId) : null;
            const title = isEditing ? 'Edit Loan' : 'Add New Loan';
            const memberOptions = this.state.data.members.map(m => `<option value="${m.id}" ${loan && loan.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('');
            let body = `
                <div class="grid grid-cols-1 gap-4">
                    <div><label class="block text-sm font-medium">Member</label><select id="loanMemberId" class="mt-1 block w-full border rounded-md p-2">${memberOptions}</select></div>
                    <div><label class="block text-sm font-medium">Loan Amount (₹)</label><input type="number" id="loanAmount" min="0" class="mt-1 block w-full border rounded-md p-2" value="${loan ? loan.amount : ''}"></div>
                    <div><label class="block text-sm font-medium">Issue Date</label><input type="date" id="loanIssueDate" class="mt-1 block w-full border rounded-md p-2" value="${loan ? loan.issueDate : new Date().toISOString().split('T')[0]}"></div>
                    <div><label class="block text-sm font-medium">Disbursement Mode</label><select id="loanDisbursementMode" class="mt-1 block w-full border rounded-md p-2">
                        <option value="Google Pay" ${loan && loan.disbursementMode === 'Google Pay' ? 'selected' : ''}>Google Pay</option><option value="Paytm" ${loan && loan.disbursementMode === 'Paytm' ? 'selected' : ''}>Paytm</option><option value="BHIM" ${loan && loan.disbursementMode === 'BHIM' ? 'selected' : ''}>BHIM</option><option value="PhonePe" ${loan && loan.disbursementMode === 'PhonePe' ? 'selected' : ''}>PhonePe</option><option value="Offline" ${loan && loan.disbursementMode === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select></div>
                    <div><label class="block text-sm font-medium">Loan Status</label><select id="loanStatus" class="mt-1 block w-full border rounded-md p-2">
                        <option value="active" ${loan && loan.status === 'active' ? 'selected' : ''}>Active</option><option value="closed" ${loan && loan.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select></div>
                     <div id="loanClosingFields" class="${loan && loan.status === 'closed' ? '' : 'hidden'}">
                        <div class="mt-4"><label class="block text-sm font-medium">Close Date</label><input type="date" id="loanCloseDate" class="mt-1 block w-full border rounded-md p-2" value="${loan ? loan.closeDate : ''}"></div>
                        <div class="mt-4"><label class="block text-sm font-medium">Repayment Mode</label><select id="loanRepaymentMode" class="mt-1 block w-full border rounded-md p-2">
                            <option value="">Select Mode</option><option value="Google Pay" ${loan && loan.repaymentMode === 'Google Pay' ? 'selected' : ''}>Google Pay</option><option value="Paytm" ${loan && loan.repaymentMode === 'Paytm' ? 'selected' : ''}>Paytm</option><option value="BHIM" ${loan && loan.repaymentMode === 'BHIM' ? 'selected' : ''}>BHIM</option><option value="PhonePe" ${loan && loan.repaymentMode === 'PhonePe' ? 'selected' : ''}>PhonePe</option><option value="Offline" ${loan && loan.repaymentMode === 'Offline' ? 'selected' : ''}>Offline</option>
                        </select></div>
                     </div>
                </div>
            `;
             if (isEditing) {
                body += `
                    <div class="mt-6 border-t pt-4">
                        <h4 class="text-md font-semibold text-red-600">Danger Zone</h4>
                        <p class="text-sm text-gray-500 mt-1">To delete this loan, type <strong class="text-red-700">DELETE LOAN</strong> below.</p>
                        <input type="text" id="deleteConfirmation" class="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="DELETE LOAN">
                        <button id="deleteLoanBtn" class="mt-2 w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled>Delete Permanently</button>
                    </div>`;
            }
            this.showModal({
                title: title, body: body,
                action: { label: isEditing ? 'Save Changes' : 'Add Loan', callback: () => this.handleSaveLoan(loanId) }
            });
            document.getElementById('loanStatus').addEventListener('change', (e) => {
                document.getElementById('loanClosingFields').classList.toggle('hidden', e.target.value !== 'closed');
            });
            if(isEditing) {
                const confirmInput = document.getElementById('deleteConfirmation');
                const deleteBtn = document.getElementById('deleteLoanBtn');
                confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value !== 'DELETE LOAN'; });
                deleteBtn.addEventListener('click', () => this.handleDeleteLoan(loanId));
            }
        },
        
        showFdModal(fdId = null) {
            const isEditing = fdId !== null;
            const fd = isEditing ? this.state.data.fds.find(f => f.id === fdId) : null;
            const title = isEditing ? 'Edit FD' : 'Add New FD';
            const memberOptions = this.state.data.members.map(m => `<option value="${m.id}" ${fd && fd.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('');
            let body = `
                <div class="grid grid-cols-1 gap-4">
                    <div><label class="block text-sm font-medium">Member</label><select id="fdMemberId" class="mt-1 block w-full border rounded-md p-2">${memberOptions}</select></div>
                    <div><label class="block text-sm font-medium">FD Amount (₹)</label><input type="number" id="fdAmount" min="0" class="mt-1 block w-full border rounded-md p-2" value="${fd ? fd.amount : ''}"></div>
                    <div><label class="block text-sm font-medium">Start Date</label><input type="date" id="fdStartDate" class="mt-1 block w-full border rounded-md p-2" value="${fd ? fd.startDate : new Date().toISOString().split('T')[0]}"></div>
                     <div><label class="block text-sm font-medium">Investment Mode</label><select id="fdInvestmentMode" class="mt-1 block w-full border rounded-md p-2">
                        <option value="Google Pay" ${fd && fd.investmentMode === 'Google Pay' ? 'selected' : ''}>Google Pay</option><option value="Paytm" ${fd && fd.investmentMode === 'Paytm' ? 'selected' : ''}>Paytm</option><option value="BHIM" ${fd && fd.investmentMode === 'BHIM' ? 'selected' : ''}>BHIM</option><option value="PhonePe" ${fd && fd.investmentMode === 'PhonePe' ? 'selected' : ''}>PhonePe</option><option value="Offline" ${fd && fd.investmentMode === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select></div>
                    <div><label class="block text-sm font-medium">FD Status</label><select id="fdStatus" class="mt-1 block w-full border rounded-md p-2">
                        <option value="active" ${fd && fd.status === 'active' ? 'selected' : ''}>Active</option><option value="closed" ${fd && fd.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select></div>
                     <div id="fdClosingFields" class="${fd && fd.status === 'closed' ? '' : 'hidden'}">
                         <div class="mt-4"><label class="block text-sm font-medium">Close Date</label><input type="date" id="fdCloseDate" class="mt-1 block w-full border rounded-md p-2" value="${fd ? fd.closeDate : ''}"></div>
                         <div class="mt-4"><label class="block text-sm font-medium">Payout Mode</label><select id="fdPayoutMode" class="mt-1 block w-full border rounded-md p-2">
                            <option value="">Select Mode</option><option value="Google Pay" ${fd && fd.payoutMode === 'Google Pay' ? 'selected' : ''}>Google Pay</option><option value="Paytm" ${fd && fd.payoutMode === 'Paytm' ? 'selected' : ''}>Paytm</option><option value="BHIM" ${fd && fd.payoutMode === 'BHIM' ? 'selected' : ''}>BHIM</option><option value="PhonePe" ${fd && fd.payoutMode === 'PhonePe' ? 'selected' : ''}>PhonePe</option><option value="Offline" ${fd && fd.payoutMode === 'Offline' ? 'selected' : ''}>Offline</option>
                        </select></div>
                     </div>
                </div>`;
             if (isEditing) {
                body += `
                    <div class="mt-6 border-t pt-4">
                        <h4 class="text-md font-semibold text-red-600">Danger Zone</h4>
                        <p class="text-sm text-gray-500 mt-1">To delete this FD, type <strong class="text-red-700">DELETE FD</strong> below.</p>
                        <input type="text" id="deleteConfirmation" class="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="DELETE FD">
                        <button id="deleteFdBtn" class="mt-2 w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled>Delete Permanently</button>
                    </div>`;
            }
            this.showModal({
                title: title, body: body,
                action: { label: isEditing ? 'Save Changes' : 'Add FD', callback: () => this.handleSaveFd(fdId) }
            });
            document.getElementById('fdStatus').addEventListener('change', (e) => {
                document.getElementById('fdClosingFields').classList.toggle('hidden', e.target.value !== 'closed');
            });
             if(isEditing) {
                const confirmInput = document.getElementById('deleteConfirmation');
                const deleteBtn = document.getElementById('deleteFdBtn');
                confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value !== 'DELETE FD'; });
                deleteBtn.addEventListener('click', () => this.handleDeleteFd(fdId));
            }
        },
        
        showContributionModal(memberId, monthIndex, existingContribution = null) {
            const isEditing = existingContribution !== null;
            const member = this.state.data.members.find(m => m.id === memberId);
            const title = isEditing 
                ? `Edit Contribution for ${member.name} - ${this.MONTHS[monthIndex]}` 
                : `Log Contribution for ${member.name} - ${this.MONTHS[monthIndex]}`;
            const defaultPaymentDate = isEditing ? existingContribution.date : new Date().toISOString().split('T')[0];
            const body = `
                <p class="mb-4">Amount: <strong>${this.formatCurrency(member.monthlyContribution)}</strong></p>
                <div><label class="block text-sm font-medium">Payment Date</label><input type="date" id="contributionDate" class="mt-1 block w-full border rounded-md p-2" value="${defaultPaymentDate}"></div>
                <div class="mt-4"><label class="block text-sm font-medium">Payment Mode</label><select id="contributionMode" class="mt-1 block w-full border rounded-md p-2">
                    <option>Google Pay</option><option>Paytm</option><option>BHIM</option><option>PhonePe</option><option>Offline</option>
                </select></div>
                <div class="mt-4"><label class="block text-sm font-medium">Remarks</label><input type="text" id="contributionRemarks" class="mt-1 block w-full border rounded-md p-2" value="${isEditing ? existingContribution.remarks : ''}"></div>
                <div id="lateFeeSectionContainer" class="mt-4"></div>
                ${isEditing ? `
                    <div class="mt-6 border-t pt-4">
                        <h4 class="text-md font-semibold text-red-600">Danger Zone</h4>
                        <p class="text-sm text-gray-500 mt-1">To delete this payment record, type <strong class="text-red-700">UNCHECK</strong> below.</p>
                        <input type="text" id="deleteConfirmation" class="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="UNCHECK">
                        <button id="deleteContributionBtn" class="mt-2 w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled>Delete Payment Record</button>
                    </div>
                `: ''}`;
            this.showModal({
                title, body,
                action: { label: isEditing ? 'Save Changes' : 'Log Payment', callback: () => this.handleSaveContribution(memberId, monthIndex) }
            });
            if (isEditing) {
                document.getElementById('contributionMode').value = existingContribution.mode;
            }
            const dateInput = document.getElementById('contributionDate');
            const updateLateFeeUI = () => {
                const paymentDate = new Date(dateInput.value + 'T00:00:00');
                const dueDate = this.getContributionDueDate(monthIndex, this.state.currentFinancialYear);
                const isLate = paymentDate >= dueDate;
                const container = document.getElementById('lateFeeSectionContainer');
                if (isLate) {
                    const lateFee = (parseFloat(member.monthlyContribution) * this.LATE_FEE_RATE).toFixed(2);
                    const wasForgiven = isEditing && existingContribution.lateFeeForgiven;
                    container.innerHTML = `
                        <div class="bg-yellow-100 p-3 rounded-md">
                            <p class="text-sm text-yellow-800">Payment is late. A late fee of <strong>${this.formatCurrency(lateFee)}</strong> applies.</p>
                            <div class="mt-2"><label class="flex items-center">
                                <input type="checkbox" id="forgiveLateFee" class="h-4 w-4 text-indigo-600 border-gray-300 rounded" ${wasForgiven ? 'checked' : ''}>
                                <span class="ml-2 text-sm text-gray-700">Forgive Late Fee</span>
                            </label></div>
                        </div>`;
                } else container.innerHTML = '';
            };
            dateInput.addEventListener('change', updateLateFeeUI);
            updateLateFeeUI();
            if (isEditing) {
                const confirmInput = document.getElementById('deleteConfirmation');
                const deleteBtn = document.getElementById('deleteContributionBtn');
                confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value !== 'UNCHECK'; });
                deleteBtn.addEventListener('click', () => this.handleDeleteContribution(memberId, monthIndex));
            }
        },
        
        showEditContributionModal(memberId, monthIndex) {
            const contributionData = this.state.data.contributions[memberId]?.[monthIndex];
            if (contributionData) this.showContributionModal(memberId, monthIndex, contributionData);
        },

        showManageYearsModal() {
            const availableYears = this.getAvailableFinancialYears().sort().reverse();
            const latestYear = availableYears[0];
            const nextYear = `${parseInt(latestYear.split('-')[0], 10) + 1}-${parseInt(latestYear.split('-')[1], 10) + 1}`;
            let body = `
                <h4 class="font-semibold">Create New Financial Year</h4>
                <p class="text-sm text-gray-600 mb-2">Create the next financial year. This will carry over balances and active items from <strong>${latestYear}</strong>.</p>
                <div class="flex items-center space-x-2">
                    <input type="text" id="newFinancialYear" class="flex-grow block w-full border rounded-md p-2 bg-gray-100" value="${nextYear}" readonly>
                    <button id="createYearBtn" class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700">Create</button>
                </div>
                <hr class="my-4">
                <h4 class="font-semibold">Existing Financial Years</h4><ul class="mt-2 space-y-1">${availableYears.map(year => `<li class="text-sm">${year}</li>`).join('')}</ul>`;
            this.showModal({ title: "Manage Financial Years", body });
            document.getElementById('modal-footer').innerHTML = `<button class="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" onclick="App.closeModal()">Close</button>`;
            document.getElementById('createYearBtn').addEventListener('click', () => {
                this.handleCreateFinancialYear(document.getElementById('newFinancialYear').value, latestYear);
            });
        },
        
        // --- DATA HANDLERS ---
        handleSaveMember(memberId = null) {
            const name = document.getElementById('memberName').value.trim();
            const monthlyContribution = document.getElementById('monthlyContribution').value;
            if (!name || !monthlyContribution || parseFloat(monthlyContribution) <= 0) {
                this.showToast('Please fill in all fields with valid data.', 'error'); return;
            }
            if (memberId) {
                const member = this.state.data.members.find(m => m.id === memberId);
                member.name = name;
                member.monthlyContribution = monthlyContribution;
                 this.showToast('Member updated successfully.', 'success');
            } else {
                this.state.data.members.push({ id: this.generateId('m'), name, monthlyContribution });
                 this.showToast('Member added successfully.', 'success');
            }
            this.saveCurrentData(); this.render(); this.closeModal();
        },
        
        handleDeleteMember(memberId) {
            this.state.data.loans = this.state.data.loans.filter(l => l.memberId !== memberId);
            this.state.data.fds = this.state.data.fds.filter(f => f.memberId !== memberId);
            delete this.state.data.contributions[memberId];
            this.state.data.members = this.state.data.members.filter(m => m.id !== memberId);
            this.saveCurrentData(); this.render(); this.closeModal();
            this.showToast('Member and all associated data deleted.', 'success');
        },
        
        handleSaveLoan(loanId = null) {
            const loanData = {
                memberId: document.getElementById('loanMemberId').value,
                amount: parseFloat(document.getElementById('loanAmount').value),
                issueDate: document.getElementById('loanIssueDate').value,
                disbursementMode: document.getElementById('loanDisbursementMode').value,
                status: document.getElementById('loanStatus').value,
                closeDate: document.getElementById('loanCloseDate').value,
                repaymentMode: document.getElementById('loanRepaymentMode').value,
            };
            if (!loanData.memberId || isNaN(loanData.amount) || loanData.amount <= 0 || !loanData.issueDate) {
                 this.showToast('Please fill in all required fields correctly.', 'error'); return;
            }
            if (loanData.status === 'closed' && (!loanData.closeDate || !loanData.repaymentMode)) {
                 this.showToast('Close Date and Repayment Mode are required for closed loans.', 'error'); return;
            }
            if (loanData.status === 'active') {
                loanData.closeDate = null;
                loanData.repaymentMode = null;
            }
            if (loanId) {
                const index = this.state.data.loans.findIndex(l => l.id === loanId);
                this.state.data.loans[index] = {...this.state.data.loans[index], ...loanData};
                 this.showToast('Loan updated successfully.', 'success');
            } else {
                loanData.id = this.generateId('l');
                this.state.data.loans.push(loanData);
                 this.showToast('Loan added successfully.', 'success');
            }
            this.saveCurrentData(); this.render(); this.closeModal();
        },

        handleDeleteLoan(loanId) {
            this.state.data.loans = this.state.data.loans.filter(l => l.id !== loanId);
            this.saveCurrentData(); this.render(); this.closeModal();
            this.showToast('Loan deleted.', 'success');
        },

        handleSaveFd(fdId = null) {
            const fdData = {
                memberId: document.getElementById('fdMemberId').value,
                amount: parseFloat(document.getElementById('fdAmount').value),
                startDate: document.getElementById('fdStartDate').value,
                investmentMode: document.getElementById('fdInvestmentMode').value,
                status: document.getElementById('fdStatus').value,
                closeDate: document.getElementById('fdCloseDate').value,
                payoutMode: document.getElementById('fdPayoutMode').value,
            };
             if (!fdData.memberId || isNaN(fdData.amount) || fdData.amount <= 0 || !fdData.startDate) {
                 this.showToast('Please fill in all required fields correctly.', 'error'); return;
            }
            if (fdData.status === 'closed' && (!fdData.closeDate || !fdData.payoutMode)) {
                 this.showToast('Close Date and Payout Mode are required for closed FDs.', 'error'); return;
            }
             if (fdData.status === 'active') {
                fdData.closeDate = null;
                fdData.payoutMode = null;
            }
            if (fdId) {
                 const index = this.state.data.fds.findIndex(f => f.id === fdId);
                 this.state.data.fds[index] = {...this.state.data.fds[index], ...fdData};
                 this.showToast('FD updated successfully.', 'success');
            } else {
                fdData.id = this.generateId('fd');
                this.state.data.fds.push(fdData);
                this.showToast('FD added successfully.', 'success');
            }
            this.saveCurrentData(); this.render(); this.closeModal();
        },

        handleDeleteFd(fdId) {
            this.state.data.fds = this.state.data.fds.filter(f => f.id !== fdId);
            this.saveCurrentData(); this.render(); this.closeModal();
            this.showToast('FD deleted.', 'success');
        },

        handleSaveContribution(memberId, monthIndex) {
             const member = this.state.data.members.find(m => m.id === memberId);
             const paymentDate = new Date(document.getElementById('contributionDate').value + 'T00:00:00');
             const forgiveFeeEl = document.getElementById('forgiveLateFee');
             const forgiveFee = forgiveFeeEl ? forgiveFeeEl.checked : false;
             const dueDate = this.getContributionDueDate(monthIndex, this.state.currentFinancialYear);
             const isActuallyLate = paymentDate >= dueDate;
             let lateFee = 0;
             if (isActuallyLate && !forgiveFee) {
                 lateFee = parseFloat(member.monthlyContribution) * this.LATE_FEE_RATE;
             }
             if (!this.state.data.contributions[memberId]) this.state.data.contributions[memberId] = {};
             const isEditing = !!this.state.data.contributions[memberId][monthIndex];
             this.state.data.contributions[memberId][monthIndex] = {
                 date: document.getElementById('contributionDate').value,
                 mode: document.getElementById('contributionMode').value,
                 remarks: document.getElementById('contributionRemarks').value.trim(),
                 lateFee: lateFee,
                 lateFeeForgiven: isActuallyLate && forgiveFee,
             };
             this.saveCurrentData(); this.render(); this.closeModal();
             this.showToast(isEditing ? 'Contribution updated.' : 'Contribution logged.', 'success');
        },

        handleDeleteContribution(memberId, monthIndex) {
            if (this.state.data.contributions[memberId]?.[monthIndex]) {
                delete this.state.data.contributions[memberId][monthIndex];
                this.saveCurrentData(); this.render(); this.closeModal();
                this.showToast('Contribution record deleted.', 'success');
            }
        },
        
        handleCreateFinancialYear(newYear, previousYear) {
            if (this.getAvailableFinancialYears().includes(newYear)) {
                this.showToast('This financial year already exists.', 'error'); return;
            }
            const prevYearData = JSON.parse(localStorage.getItem(this.STORAGE_PREFIX + previousYear));
            if (!prevYearData) {
                this.showToast('Could not find data for the previous year to carry over.', 'error'); return;
            }
            const originalStateData = { ...this.state.data };
            this.state.data = prevYearData;
            const prevYearCalculations = this.calculateFinancials();
            this.state.data = originalStateData; 
            const newYearData = this.getNewYearDataStructure({
                online: prevYearCalculations.onlineBalance,
                offline: prevYearCalculations.offlineBalance
            });
            newYearData.members = JSON.parse(JSON.stringify(prevYearData.members));
            newYearData.loans = JSON.parse(JSON.stringify(prevYearData.loans.filter(l => l.status === 'active')));
            newYearData.fds = JSON.parse(JSON.stringify(prevYearData.fds.filter(f => f.status === 'active')));
            this.saveDataForYear(newYear, newYearData);
            this.initFinancialYear(); 
            document.getElementById('financialYearSelector').value = newYear; 
            this.loadDataForYear(newYear);
            this.render(); this.closeModal();
            this.showToast(`Financial year ${newYear} created successfully.`, 'success');
        },

        // --- DATA I/O ---
        backupData() {
            const dataStr = JSON.stringify(this.state.data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jagarani-backup-${this.state.currentFinancialYear}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast('Backup successful!', 'success');
        },
        
        restoreData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const restoredData = JSON.parse(e.target.result);
                    if (restoredData.members && restoredData.loans && restoredData.fds) {
                         this.showRestoreConfirmationModal(restoredData);
                    } else {
                        this.showToast('Invalid data file format.', 'error');
                    }
                } catch (err) {
                    this.showToast('Error reading file. Not a valid JSON backup.', 'error');
                    console.error(err);
                } finally {
                    event.target.value = null;
                }
            };
            reader.readAsText(file);
        },
        
        showRestoreConfirmationModal(restoredData) {
            const title = "Confirm Restore";
            const body = `
                <p class="text-sm text-red-600 font-bold">This will overwrite all data for the current financial year (${this.state.currentFinancialYear}). This action cannot be undone.</p>
                <p class="text-sm text-gray-700 mt-2">To confirm, type <strong class="text-red-700">RESTORE</strong> below.</p>
                 <input type="text" id="restoreConfirmation" class="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="RESTORE">
            `;
             this.showModal({
                title, body,
                action: {
                    label: "Confirm & Restore",
                    classes: 'py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300',
                    callback: () => {
                        if (document.getElementById('restoreConfirmation').value === 'RESTORE') {
                            this.state.data = restoredData;
                            this.saveCurrentData();
                            this.render();
                            this.closeModal();
                            this.showToast('Data restored successfully!', 'success');
                        } else {
                            this.showToast('Confirmation text does not match.', 'error');
                        }
                    }
                }
            });
            const actionBtn = document.getElementById('modal-action-btn');
            actionBtn.disabled = true;
            document.getElementById('restoreConfirmation').addEventListener('input', (e) => {
                actionBtn.disabled = e.target.value !== 'RESTORE';
            });
        },

        // --- UTILITIES ---
        calculateMonthsBetween(start, end) {
            if (!start || !end || end < start) return 0;
            
            let d1 = new Date(start.getTime());
            let d2 = new Date(end.getTime());

            // If the start and end date are the same, it's considered 1 month.
            if (d1.getTime() === d2.getTime()) {
                return 1;
            }

            let months;
            months = (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12;
            months -= d1.getUTCMonth();
            months += d2.getUTCMonth();
            
            if (d2.getUTCDate() < d1.getUTCDate()) {
                months--;
            }

            // Any period, even one day, counts as the first month.
            // The calculated months represent *full* months passed, so we add 1.
            return months + 1;
        },

        getContributionDueDate(monthIndex, financialYear) {
            const [startYear, endYear] = financialYear.split('-').map(Number);
            let month, year;
            if (monthIndex <= 3) {
                month = 8 + monthIndex;
                year = startYear;
            } else {
                month = monthIndex - 4;
                year = endYear;
            }
            return new Date(year, month, 16); 
        },

        formatCurrency(amount, allowNegative = false) {
            const options = { style: 'currency', currency: 'INR', minimumFractionDigits: 2 };
            if (allowNegative) {
                return new Intl.NumberFormat('en-IN', options).format(amount);
            }
            return new Intl.NumberFormat('en-IN', options).format(Math.max(0, amount));
        },
        
        generateId(prefix) {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
        
        showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 5000);
        },
        
        trapFocus(modalElement) {
            const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstFocusableElement = focusableElements[0];
            const lastFocusableElement = focusableElements[focusableElements.length - 1];
            this.state.focusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            };
            document.addEventListener('keydown', this.state.focusTrapHandler);
            if (firstFocusableElement) firstFocusableElement.focus();
        },
    };
    
    App.init();
    window.App = App;
});
