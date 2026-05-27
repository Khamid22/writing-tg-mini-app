import { useState, type JSX } from "react";
import { CreditCard } from "lucide-react";
import { requestManualPayment } from "../api";
import type { LearnerState } from "../types";
import { learnedWords } from "../helpers";

export function ProfileScreen({
  state,
  apiToken,
  updateState,
  onLogout,
}: {
  state: LearnerState;
  apiToken: string | null;
  updateState: (updater: (current: LearnerState) => LearnerState) => void;
  onLogout: () => void;
}): JSX.Element {
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  async function requestPremium(): Promise<void> {
    if (!apiToken) {
      setPaymentError("Telegram akkaunt tekshiruvi tugamadi. Iltimos, sahifani qayta oching.");
      return;
    }

    setIsRequestingPayment(true);
    setPaymentError(null);
    try {
      const payment = await requestManualPayment(apiToken);
      updateState((current) => ({
        ...current,
        paymentRequest: payment,
      }));
    } catch {
      setPaymentError("To'lov so'rovini yaratib bo'lmadi. Birozdan keyin qayta urinib ko'ring.");
    } finally {
      setIsRequestingPayment(false);
    }
  }

  const payment = state.paymentRequest;

  return (
    <section className="profile-layout">
      <div className="profile-card">
        <div className="avatar">{state.displayName.charAt(0).toUpperCase()}</div>
        <h2>{state.displayName}</h2>
        <p>@{state.username}</p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Tarif</h2>
          <span>{state.tier === "paid" ? "pullik" : "bepul"}</span>
        </div>
        {state.tier === "paid" ? (
          <p className="muted">Premium faol. Cheksiz so'z o'rganish ochiq.</p>
        ) : (
          <button className="primary-button wide" type="button" onClick={requestPremium} disabled={isRequestingPayment}>
            <CreditCard size={16} /> {isRequestingPayment ? "Yaratilmoqda..." : "Pullik tarifga o'tish"}
          </button>
        )}
        {paymentError ? <p className="form-error">{paymentError}</p> : null}
      </section>
      {payment ? (
        <section className="panel payment-panel">
          <div className="panel-heading">
            <h2>To'lov so'rovi</h2>
            <span>{payment.status}</span>
          </div>
          <div className="payment-code">{payment.code}</div>
          <div className="profile-stat">
            <span>Tarif</span>
            <strong>{payment.planDays} kun premium</strong>
          </div>
          <div className="profile-stat">
            <span>Summa</span>
            <strong>{payment.amountUzs.toLocaleString("uz-UZ")} UZS</strong>
          </div>
          <div className="profile-stat">
            <span>Karta</span>
            <strong>{payment.cardLabel}</strong>
          </div>
          <p className="payment-help">
            Kartaga to'lov qiling. Screenshotni botga yuboring va xabarda kodni yozing:
            {" "}
            <strong>{payment.code}</strong>
          </p>
        </section>
      ) : null}
      <section className="panel">
        <div className="profile-stat">
          <span>Kunlik limit</span>
          <strong>{state.tier === "paid" ? "Cheksiz" : "10 ta so'z"}</strong>
        </div>
        <div className="profile-stat">
          <span>Ommaviy profil</span>
          <strong>{learnedWords(state).length} ta so'z</strong>
        </div>
      </section>
      <button className="secondary-button wide" type="button" onClick={onLogout}>
        Chiqish
      </button>
    </section>
  );
}
