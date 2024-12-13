import React from 'react';
import { motion } from 'framer-motion';
import { useForm } from '@/hooks/useForm';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface BaseFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
  customValidation?: (value: any) => string | undefined;
}

const FieldWrapper: React.FC<BaseFieldProps & {
  children: React.ReactNode;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
}> = ({
  label,
  description,
  required,
  error,
  touched,
  isValid,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <span>{label}</span>
            {required && (
              <span className="text-red-500">*</span>
            )}
            {description && (
              <HelpCircle className="w-4 h-4 text-gray-400" />
            )}
          </Label>
          {touched && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center"
            >
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : null}
            </motion.div>
          )}
        </div>
      )}
      
      {children}
      
      {description && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-sm text-gray-500"
        >
          {description}
        </motion.p>
      )}
      
      {error && touched && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-sm text-red-500 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
    </div>
  );
};

export const TextField: React.FC<BaseFieldProps & {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}> = ({
  name,
  type = 'text',
  label,
  description,
  required,
  disabled,
  placeholder,
  className,
  showValidation,
  customValidation,
  value,
  onChange,
  onBlur,
}) => {
  const { state, setFieldValue, setFieldTouched } = useForm();
  const field = state.fields[name];
  const [showPassword, setShowPassword] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFieldValue(name, newValue);
    onChange?.(newValue);
  };

  const handleBlur = () => {
    setFieldTouched(name);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={field?.error}
      touched={field?.touched}
      isValid={field?.isValid}
      className={className}
    >
      <div className="relative">
        <Input
          type={type === 'password' && showPassword ? 'text' : type}
          id={name}
          name={name}
          value={value ?? field?.value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full',
            field?.error && field?.touched && 'border-red-500',
            field?.isValid && field?.touched && 'border-green-500'
          )}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-gray-500" />
            ) : (
              <Eye className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
    </FieldWrapper>
  );
};

export const NumberField: React.FC<BaseFieldProps & {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  value?: number;
  onChange?: (value: number) => void;
  onBlur?: () => void;
}> = ({
  name,
  label,
  description,
  required,
  disabled,
  min,
  max,
  step,
  placeholder,
  className,
  showValidation,
  customValidation,
  value,
  onChange,
  onBlur,
}) => {
  const { state, setFieldValue, setFieldTouched } = useForm();
  const field = state.fields[name];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? '' : Number(e.target.value);
    setFieldValue(name, newValue);
    onChange?.(Number(newValue));
  };

  const handleBlur = () => {
    setFieldTouched(name);
    onBlur?.();
  };

  return (
    <FieldWrapper
      label={label}
      description={description}
      required={required}
      error={field?.error}
      touched={field?.touched}
      isValid={field?.isValid}
      className={className}
    >
      <Input
        type="number"
        id={name}
        name={name}
        value={value ?? field?.value ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(
          'w-full',
          field?.error && field?.touched && 'border-red-500',
          field?.isValid && field?.touched && 'border-green-500'
        )}
      />
    </FieldWrapper>
  );
};

export { FieldWrapper };