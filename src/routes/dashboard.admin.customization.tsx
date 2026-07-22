import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { getMyRestaurant, updateMyRestaurant, type PaymentDetails, type WalletConfig, type BankConfig, type HeroSettings } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Building2, Image, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/dashboard/admin/customization")({
  component: Customization,
});

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Bank of Abyssinia',
  'Cooperative Bank of Oromia (CBO)',
  'Dashen Bank',
  'Debub Global Bank',
  'Enat Bank',
  'Hibret Bank',
  'Lion International Bank',
  'Nib International Bank',
  'Oromia International Bank',
  'United Bank',
  'Wegagen Bank',
  'Zemen Bank',
  'Amhara Bank',
  'Berhan International Bank',
  'Abay Bank',
  'Addis International Bank',
  'Tsehay Bank',
  'Gadaa Bank',
  'Hijra Bank',
  'ZamZam Bank',
];

const WALLET_TYPES = [
  'Telebirr',
  'M-Pesa',
  'eBirr',
  'HelloCash',
  'Amole',
];

function Customization() {
  const { user } = useAuthStore();

  const { data: restaurantData, isLoading: loadingRestaurant } = useQuery({
    queryKey: ['my-restaurant'],
    queryFn: getMyRestaurant,
    enabled: !!user,
  });

  const restaurant = restaurantData?.data;
  const paymentDetails = restaurant?.payment_details;
  const settings = restaurant?.settings || {};
  const heroSettings = settings?.hero as HeroSettings | undefined;

  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [banks, setBanks] = useState<BankConfig[]>([]);
  const [hero, setHero] = useState<HeroSettings>({
    tagline: '',
    heading: '',
    subtitle: '',
    background_image: '',
  });

  useEffect(() => {
    if (paymentDetails) {
      setWallets(paymentDetails.wallets || []);
      setBanks(paymentDetails.banks || []);
    }
    if (heroSettings) {
      setHero(heroSettings);
    }
  }, [paymentDetails, heroSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: { payment_details: PaymentDetails; settings: Record<string, any> }) =>
      updateMyRestaurant(data),
    onSuccess: () => {
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save settings'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      payment_details: { wallets, banks },
      settings: { ...settings, hero },
    });
  };

  const addWallet = () => {
    setWallets([...wallets, { type: WALLET_TYPES[0], account_name: '', phone: '' }]);
  };

  const updateWallet = (index: number, field: keyof WalletConfig, value: string) => {
    const updated = [...wallets];
    updated[index] = { ...updated[index], [field]: value };
    setWallets(updated);
  };

  const removeWallet = (index: number) => {
    setWallets(wallets.filter((_, i) => i !== index));
  };

  const addBank = () => {
    setBanks([...banks, { bank_name: ETHIOPIAN_BANKS[0], account_holder: '', account_number: '' }]);
  };

  const updateBank = (index: number, field: keyof BankConfig, value: string) => {
    const updated = [...banks];
    updated[index] = { ...updated[index], [field]: value };
    setBanks(updated);
  };

  const removeBank = (index: number) => {
    setBanks(banks.filter((_, i) => i !== index));
  };

  if (loadingRestaurant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Customization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure payment options for your restaurant
        </p>
      </div>

      {/* Digital Wallets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Digital Wallets
            </CardTitle>
            <CardDescription>
              Configure mobile money and digital wallet accounts (Telebirr, M-Pesa, eBirr, etc.)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addWallet}>
            <Plus className="h-4 w-4 mr-1" /> Add Wallet
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No wallet accounts configured. Click "Add Wallet" to add one.
            </p>
          )}
          {wallets.map((wallet, index) => (
            <div key={index} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Wallet #{index + 1}</span>
                <button
                  onClick={() => removeWallet(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Type</label>
                  <select
                    value={wallet.type}
                    onChange={(e) => updateWallet(index, 'type', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {WALLET_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Account Name</label>
                  <input
                    type="text"
                    value={wallet.account_name}
                    onChange={(e) => updateWallet(index, 'account_name', e.target.value)}
                    placeholder="e.g. ABC Restaurant"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={wallet.phone}
                    onChange={(e) => updateWallet(index, 'phone', e.target.value)}
                    placeholder="e.g. 0911XXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Accounts
            </CardTitle>
            <CardDescription>
              Configure bank transfer accounts for your customers
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addBank}>
            <Plus className="h-4 w-4 mr-1" /> Add Bank
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {banks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bank accounts configured. Click "Add Bank" to add one.
            </p>
          )}
          {banks.map((bank, index) => (
            <div key={index} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Bank #{index + 1}</span>
                <button
                  onClick={() => removeBank(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Bank</label>
                  <select
                    value={bank.bank_name}
                    onChange={(e) => updateBank(index, 'bank_name', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ETHIOPIAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Account Holder</label>
                  <input
                    type="text"
                    value={bank.account_holder}
                    onChange={(e) => updateBank(index, 'account_holder', e.target.value)}
                    placeholder="e.g. ABC Restaurant PLC"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bank.account_number}
                    onChange={(e) => updateBank(index, 'account_number', e.target.value)}
                    placeholder="e.g. 10000XXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hero Section */}
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
            <input
              type="text"
              value={hero.tagline || ''}
              onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
              placeholder="Est. 2018 · Mediterranean"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Heading</label>
            <input
              type="text"
              value={hero.heading || ''}
              onChange={(e) => setHero({ ...hero, heading: e.target.value })}
              placeholder="A seasonal menu, made to order."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Subtitle</label>
            <textarea
              value={hero.subtitle || ''}
              onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
              placeholder="Browse tonight's dishes, tap through the details, and send your order straight to our kitchen."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Background Image URL</label>
            <input
              type="text"
              value={hero.background_image || ''}
              onChange={(e) => setHero({ ...hero, background_image: e.target.value })}
              placeholder="https://example.com/hero-image.jpg"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
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
    </div>
  );
}
