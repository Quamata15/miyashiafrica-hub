import { motion } from "framer-motion";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-20 h-20 mx-auto mb-6"
      >
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner logo */}
        <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
          <motion.span
            className="font-display font-extrabold text-2xl text-primary-foreground"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            M
          </motion.span>
        </div>
        {/* Pulse effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/10"
          animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm font-medium text-muted-foreground"
      >
        Chargement en cours...
      </motion.p>
    </div>
  </div>
);

export default LoadingSpinner;
