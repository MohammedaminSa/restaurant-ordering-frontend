import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { getMyRestaurant, updateMyRestaurant, type PaymentDetails, type WalletConfig, type BankConfig, type HeroSettings } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Smartphone, Building2, Image, Plus, Trash2, Save, Loader2,
  Store, Globe, DollarSign, Percent, MapPin, Phone, Mail, Clock,
  AtSign, Type
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/dashboard/admin/customization")({
  component: Customization,
});

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia (CBE)', 'Awash Bank', 'Bank of Abyssinia',
  'Cooperative Bank of Oromia (CBO)', 'Dashen Bank', 'Debub Global Bank',
  'Enat Bank', 'Hibret Bank', 'Lion International Bank', 'Nib International Bank',
  'Oromia International Bank', 'United Bank', 'Wegagen Bank', 'Zemen Bank',
  'Amhara Bank', 'Berhan International Bank', 'Abay Bank', 'Addis International Bank',
  'Tsehay Bank', 'Gadaa Bank', 'Hijra Bank', 'ZamZam Bank',
];

const WALLET_TYPES = ['Telebirr', 'M-Pesa', 'eBirr', 'HelloCash', 'Amole'];

const CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'];
const TIMEZONES = ['Africa/Addis_Ababa', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'];

type Tab = "restaurant" | "hero" | "payments";

function Customization() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("restaurant");

  const { data: restaurantData, isLoading: loadingRestaurant } = useQuery({
    queryKey: ['my-restaurant'],
    queryFn: getMyRestaurant,
    enabled: !!user,
  });

  const restaurant = restaurantData?.data;
  const paymentDetails = restaurant?.payment_details;
  const settings = restaurant?.settings || {};
  const heroSettings = settings?.hero as HeroSettings | undefined;

  // Restaurant info state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [timezone, setTimezone] = useState('UTC');
  const [taxRate, setTaxRate] = useState('');
  const [serviceChargeRate, setServiceChargeRate] = useState('');

  // Payment state
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [banks, setBanks] = useState<BankConfig[]>([]);

  // Hero state
  const [hero, setHero] = useState<HeroSettings>({ tagline: '', heading: '', subtitle: '', background_image: '' });

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setLogoUrl(restaurant.logo_url || '');
      setAddress(restaurant.address || '');
      setPhone(restaurant.phone || '');
      setEmail(restaurant.email || '');
      setCurrency(restaurant.currency || 'ETB');
      setTimezone(restaurant.timezone || 'UTC');
      setTaxRate(String(restaurant.tax_rate ?? ''));
      setServiceChargeRate(String(restaurant.service_charge_rate ?? ''));
    }
    if (paymentDetails) {
      setWallets(paymentDetails.wallets || []);
      setBanks(paymentDetails.banks || []);
    }
    if (heroSettings) {
      setHero(heroSettings);
    }
  }, [restaurant, paymentDetails, heroSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) => updateMyRestaurant(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-info'] });
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save settings'),
  });

  const handleSave = () => {
    const payload: Record<string, any> = {};
    if (tab === "restaurant") {
      payload.name = name.trim() || undefined;
      payload.description = description.trim() || undefined;
      payload.logo_url = logoUrl.trim() || undefined;
      payload.address = address.trim() || undefined;
      payload.phone = phone.trim() || undefined;
      payload.email = email.trim() || undefined;
      payload.currency = currency;
      payload.timezone = timezone;
      payload.tax_rate = taxRate ? parseFloat(taxRate) : undefined;
      payload.service_charge_rate = serviceChargeRate ? parseFloat(serviceChargeRate) : undefined;
    } else if (tab === "hero") {
      payload.settings = { ...settings, hero };
    } else if (tab === "payments") {
      payload.payment_details = { wallets, banks };
    }
    saveMutation.mutate(payload);
  };

  if (loadingRestaurant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Customization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your restaurant branding, hero section, and payment settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </span>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("restaurant")} className={tabClass("restaurant")}>
          <Store className="h-4 w-4 inline mr-1.5 -mt-0.5" />Restaurant Info
        </button>
        <button onClick={() => setTab("hero")} className={tabClass("hero")}>
          <Image className="h-4 w-4 inline mr-1.5 -mt-0.5" />Hero Section
        </button>
        <button onClick={() => setTab("payments")} className={tabClass("payments")}>
          <Building2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />Payment Methods
        </button>
      </div>

      {/* === RESTAURANT INFO TAB === */}
      {tab === "restaurant" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                General Information
              </CardTitle>
              <CardDescription>Basic details about your restaurant</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Type className="h-3.5 w-3.5" /> Restaurant Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="My Restaurant"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Globe className="h-3.5 w-3.5" /> Logo URL
                </label>
                <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Type className="h-3.5 w-3.5" /> Description
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of your restaurant"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" /> Address
                </label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 911 XXXXXX"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@restaurant.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Settings
              </CardTitle>
              <CardDescription>Currency, tax rate, and service charges</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" /> Currency
                </label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Timezone
                </label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Percent className="h-3.5 w-3.5" /> Tax Rate (%)
                </label>
                <input type="number" step="0.01" min="0" max="100" value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                  <Percent className="h-3.5 w-3.5" /> Service Charge (%)
                </label>
                <input type="number" step="0.01" min="0" max="100" value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === HERO SECTION TAB === */}
      {tab === "hero" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Hero Section
            </CardTitle>
            <CardDescription>
              Customize the landing page hero banner shown to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tagline</label>
              <input type="text" value={hero.tagline || ''}
                onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                placeholder="Est. 2018 · Mediterranean"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Heading</label>
              <input type="text" value={hero.heading || ''}
                onChange={(e) => setHero({ ...hero, heading: e.target.value })}
                placeholder="A seasonal menu, made to order."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Subtitle</label>
              <textarea value={hero.subtitle || ''}
                onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                placeholder="Browse tonight's dishes..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Background Image URL</label>
              <input type="text" value={hero.background_image || ''}
                onChange={(e) => setHero({ ...hero, background_image: e.target.value })}
                placeholder="https://example.com/hero-image.jpg"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* === PAYMENTS TAB === */}
      {tab === "payments" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Digital Wallets
                </CardTitle>
                <CardDescription>Mobile money and digital wallet accounts (Telebirr, M-Pesa, etc.)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWallets([...wallets, { type: WALLET_TYPES[0], account_name: '', phone: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add Wallet
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {wallets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No wallet accounts configured.</p>
              )}
              {wallets.map((wallet, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">Wallet #{i + 1}</span>
                    <button onClick={() => setWallets(wallets.filter((_, j) => j !== i))}
                      className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Type</label>
                      <select value={wallet.type}
                        onChange={(e) => { const u = [...wallets]; u[i] = { ...u[i], type: e.target.value }; setWallets(u); }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                        {WALLET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Account Name</label>
                      <input type="text" value={wallet.account_name}
                        onChange={(e) => { const u = [...wallets]; u[i] = { ...u[i], account_name: e.target.value }; setWallets(u); }}
                        placeholder="e.g. ABC Restaurant"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
                      <input type="text" value={wallet.phone}
                        onChange={(e) => { const u = [...wallets]; u[i] = { ...u[i], phone: e.target.value }; setWallets(u); }}
                        placeholder="0911XXXXXX"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bank Accounts
                </CardTitle>
                <CardDescription>Bank transfer accounts for your customers</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setBanks([...banks, { bank_name: ETHIOPIAN_BANKS[0], account_holder: '', account_number: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add Bank
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {banks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No bank accounts configured.</p>
              )}
              {banks.map((bank, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">Bank #{i + 1}</span>
                    <button onClick={() => setBanks(banks.filter((_, j) => j !== i))}
                      className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Bank</label>
                      <select value={bank.bank_name}
                        onChange={(e) => { const u = [...banks]; u[i] = { ...u[i], bank_name: e.target.value }; setBanks(u); }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                        {ETHIOPIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Account Holder</label>
                      <input type="text" value={bank.account_holder}
                        onChange={(e) => { const u = [...banks]; u[i] = { ...u[i], account_holder: e.target.value }; setBanks(u); }}
                        placeholder="ABC Restaurant PLC"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Account Number</label>
                      <input type="text" value={bank.account_number}
                        onChange={(e) => { const u = [...banks]; u[i] = { ...u[i], account_number: e.target.value }; setBanks(u); }}
                        placeholder="10000XXXXXX"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
