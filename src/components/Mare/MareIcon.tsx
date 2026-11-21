import React from 'react';

const MASK_URL = "url('/logos/mare.svg')";

interface MareIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  /** Fundo branco do ícone (desative para usar só o cavalo). */
  plate?: boolean;
  /** Cor do cavalo (padrão: azul do tema). */
  color?: string;
}

/**
 * Ícone do Mare: cavalo azul sobre fundo branco.
 * A cor vem do tema (--mare-icon-color) para acompanhar claro/escuro.
 */
export function MareIcon({
  size = 24,
  className = '',
  style,
  title,
  plate = true,
  color,
}: MareIconProps) {
  const glyphSize = plate ? Math.max(10, Math.round(size * 0.74)) : size;
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={
        plate
          ? `mare-icon-plate inline-flex shrink-0 items-center justify-center ${className}`
          : `inline-flex shrink-0 items-center justify-center ${className}`
      }
      style={{ width: size, height: size, ...style }}
    >
      <span
        className="mare-icon-glyph"
        style={{
          width: glyphSize,
          height: glyphSize,
          backgroundColor: color || 'var(--mare-icon-color, #000e54)',
          WebkitMaskImage: MASK_URL,
          maskImage: MASK_URL,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    </span>
  );
}

/** Foto da Mare (foto-perfil.png, versão otimizada): é o rosto dela no agente. */
export const MARE_PHOTO_SRC = '/mare/opt/foto-perfil.png';
export const MARE_PHOTO_SRC_FULL = '/mare/foto-perfil.png';

export function MareAvatar({
  size = 40,
  className = '',
  tone = 'navy',
}: {
  size?: number;
  className?: string;
  tone?: 'navy' | 'light' | 'outline';
}) {
  const ring =
    tone === 'outline'
      ? 'border border-[#0553af]/35'
      : tone === 'light'
        ? 'border border-white/70'
        : 'border border-[#000e54]/15';
  return (
    <img
      src={MARE_PHOTO_SRC}
      alt="Mare"
      width={size}
      height={size}
      className={`mare-avatar shrink-0 rounded-full object-cover ${ring} ${className}`}
      style={{ width: size, height: size, boxShadow: '0 10px 24px -16px rgba(0, 14, 84, 0.75)' }}
    />
  );
}
