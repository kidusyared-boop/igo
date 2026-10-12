import { useT } from '../../i18n';
import { askLater, remindersAvailable, turnOffReminders, turnOnReminders, useReminderChoice } from '../../services/reminders';

type Notify = (message: string) => void;

function useToggle(notify: Notify) {
  const t = useT();
  return {
    on: async () => {
      const ok = await turnOnReminders({ title: t('remind.sampleTitle'), body: t('remind.sampleBody') }).catch(() => false);
      notify(t(ok ? 'toast.remindersOn' : 'toast.remindersBlocked'));
    },
    off: async () => {
      await turnOffReminders().catch(() => {});
      notify(t('toast.remindersOff'));
    },
  };
}

/** Offers reminders once, on the phone app, until the traveler answers. */
export function ReminderOffer({ notify }: { notify: Notify }) {
  const t = useT();
  const choice = useReminderChoice();
  const toggle = useToggle(notify);
  if (!remindersAvailable() || choice !== null) return null;
  return (
    <div className="panel reminder-offer">
      <p>{t('remind.offer')}</p>
      <div className="row">
        <button type="button" className="btn ghost small" onClick={askLater}>{t('remind.notNow')}</button>
        <button type="button" className="btn primary small" onClick={() => void toggle.on()}>{t('remind.turnOn')}</button>
      </div>
    </div>
  );
}

/** The on/off switch in the trip menu. */
export function ReminderMenuItem({ notify, after }: { notify: Notify; after: () => void }) {
  const t = useT();
  const on = useReminderChoice() === 'on';
  const toggle = useToggle(notify);
  if (!remindersAvailable()) return null;
  return (
    <button type="button" className="menu-item" onClick={() => { after(); void (on ? toggle.off() : toggle.on()); }}>
      {t(on ? 'remind.turnOff' : 'remind.turnOn')}
    </button>
  );
}
