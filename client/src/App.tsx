import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import IncomesPage from "@/pages/IncomesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import AssetsPage from "@/pages/AssetsPage";
import LiabilitiesPage from "@/pages/LiabilitiesPage";
import TimePage from "@/pages/TimePage";
import GoalsPage from "@/pages/GoalsPage";
import AccountsPage from "@/pages/AccountsPage";
import DepositsPage from "@/pages/DepositsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import ImportPage from "@/pages/ImportPage";
import TransactionsPage from "@/pages/TransactionsPage";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/incomes" component={IncomesPage} />
            <Route path="/expenses" component={ExpensesPage} />
            <Route path="/assets" component={AssetsPage} />
            <Route path="/liabilities" component={LiabilitiesPage} />
            <Route path="/time" component={TimePage} />
            <Route path="/goals" component={GoalsPage} />
            <Route path="/accounts" component={AccountsPage} />
            <Route path="/deposits" component={DepositsPage} />
            <Route path="/categories" component={CategoriesPage} />
            <Route path="/import" component={ImportPage} />
            <Route path="/transactions" component={TransactionsPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
