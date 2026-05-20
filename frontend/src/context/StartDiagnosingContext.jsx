import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useMachines } from './MachineContext';
import StartDiagnosingModal from '../components/StartDiagnosingModal';

const StartDiagnosingContext = createContext({ open: () => {} });

export const StartDiagnosingProvider = ({ children }) => {
  const { user, login } = useAuth();
  const { machines } = useMachines();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('domain');
  const [picking, setPicking] = useState(false);

  const openModal = useCallback(() => {
    setStep('domain');
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (picking) return;
    setOpen(false);
  }, [picking]);

  const handlePickDomain = useCallback(
    async (domain) => {
      setPicking(true);
      const result = await login(domain);
      setPicking(false);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setStep('machine');
    },
    [login],
  );

  const handlePickMachine = useCallback(
    (machine) => {
      setOpen(false);
      navigate(`/chat?machine=${encodeURIComponent(machine.name)}`);
    },
    [navigate],
  );

  return (
    <StartDiagnosingContext.Provider value={{ open: openModal }}>
      {children}
      <StartDiagnosingModal
        open={open}
        onClose={closeModal}
        step={step}
        onPickDomain={handlePickDomain}
        onPickMachine={handlePickMachine}
        onBackToDomain={() => setStep('domain')}
        picking={picking}
        domain={user.domain}
        machines={machines}
      />
    </StartDiagnosingContext.Provider>
  );
};

export const useStartDiagnosing = () => useContext(StartDiagnosingContext);
